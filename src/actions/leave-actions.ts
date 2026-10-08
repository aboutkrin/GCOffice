"use server";

import { prisma } from "@/lib/prisma";
import { leaveRequestSchema, leaveReviewSchema } from "@/lib/validators";
import { toUTCNoon } from "@/lib/thai-date";
import { assertAdmin, requireUserAction } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { actionErrorMessage } from "@/lib/action-error";

function leaveData(validated: ReturnType<typeof leaveRequestSchema.parse>) {
  return {
    type: validated.type,
    startDate: toUTCNoon(validated.startDate),
    endDate: toUTCNoon(validated.endDate),
    period: validated.period,
    reason: validated.reason?.trim() || null,
  };
}

/**
 * STAFF request leave for themselves (PENDING, needs approval).
 * ADMIN may record leave for anyone; it is approved immediately.
 */
export async function createLeaveRequest(data: unknown): Promise<{ error?: string }> {
  try {
    const user = await requireUserAction();
    const validated = leaveRequestSchema.parse(data);
    const isAdmin = user.role === "ADMIN";
    const profileId = isAdmin && validated.profileId ? validated.profileId : user.id;

    await prisma.leaveRequest.create({
      data: {
        ...leaveData(validated),
        profileId,
        createdById: user.id,
        ...(isAdmin
          ? { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() }
          : { status: "PENDING" }),
      },
    });
    revalidatePath("/dashboard");
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

/** Owner may edit while PENDING; ADMIN may edit any leave. */
export async function updateLeaveRequest(id: string, data: unknown): Promise<{ error?: string }> {
  try {
    const user = await requireUserAction();
    const validated = leaveRequestSchema.parse(data);
    const leave = await prisma.leaveRequest.findUniqueOrThrow({ where: { id } });
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && (leave.profileId !== user.id || leave.status !== "PENDING")) {
      throw new Error("แก้ไขได้เฉพาะคำขอลาของตัวเองที่ยังรออนุมัติ");
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        ...leaveData(validated),
        ...(isAdmin && validated.profileId ? { profileId: validated.profileId } : {}),
      },
    });
    revalidatePath("/dashboard");
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

/** Owner may cancel their own PENDING/APPROVED leave; ADMIN may cancel any. */
export async function cancelLeaveRequest(id: string) {
  const user = await requireUserAction();
  const leave = await prisma.leaveRequest.findUniqueOrThrow({ where: { id } });

  if (user.role !== "ADMIN" && leave.profileId !== user.id) {
    throw new Error("ยกเลิกได้เฉพาะคำขอลาของตัวเอง");
  }
  if (leave.status !== "PENDING" && leave.status !== "APPROVED") {
    throw new Error("คำขอลานี้ไม่สามารถยกเลิกได้");
  }

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/dashboard");
}

export async function reviewLeaveRequest(id: string, data: unknown) {
  const admin = await assertAdmin();
  const validated = leaveReviewSchema.parse(data);
  const leave = await prisma.leaveRequest.findUniqueOrThrow({ where: { id } });

  if (leave.status !== "PENDING") {
    throw new Error("คำขอลานี้ได้รับการพิจารณาแล้ว");
  }

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: validated.approve ? "APPROVED" : "REJECTED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: validated.note?.trim() || null,
    },
  });
  revalidatePath("/dashboard");
}
