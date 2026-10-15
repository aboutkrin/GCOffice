"use server";

import { prisma } from "@/lib/prisma";
import { appointmentSchema, appointmentReviewSchema } from "@/lib/validators";
import { toUTCNoon } from "@/lib/thai-date";
import { assertAdmin, requireUserAction } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { actionErrorMessage } from "@/lib/action-error";
import { searchCustomers } from "@/data/customers";

type Validated = ReturnType<typeof appointmentSchema.parse>;

function appointmentData(validated: Validated) {
  return {
    kind: validated.kind,
    companyName: validated.companyName.trim(),
    customerId: validated.customerId || null,
    location: validated.location?.trim() || null,
    mapUrl: validated.mapUrl?.trim() || null,
    contactName: validated.contactName?.trim() || null,
    contactPhone: validated.contactPhone?.trim() || null,
    date: toUTCNoon(validated.date),
    startTime: validated.startTime,
    endTime: validated.endTime || null,
    note: validated.note?.trim() || null,
    attendeeId: validated.attendeeId,
  };
}

/**
 * Going out to a customer is for admins only. A showroom visit can also be
 * received by any active staff member. Returns whether the attendee is an admin.
 */
async function assertAttendee(attendeeId: string, kind: Validated["kind"]): Promise<{ isAdmin: boolean }> {
  const attendee = await prisma.profile.findUnique({
    where: { id: attendeeId },
    select: { role: true, status: true },
  });
  if (!attendee || attendee.status !== "ACTIVE") {
    throw new Error("ผู้รับนัดต้องเป็นผู้ใช้ที่ยังใช้งานอยู่");
  }
  const isAdmin = attendee.role === "ADMIN";
  if (kind !== "SHOWROOM" && !isAdmin) {
    throw new Error("ผู้ไปพบลูกค้าต้องเป็นแอดมิน (พนักงานรับนัดได้เฉพาะลูกค้ามาชมโชว์รูม)");
  }
  return { isAdmin };
}

/**
 * Anyone may book an appointment. It is CONFIRMED at once when the booker is
 * the attendee, or when the attendee is a staff member (showroom visits only:
 * staff never need an admin to confirm they are free). Booking for another
 * admin waits (PENDING) until an admin confirms.
 */
export async function createAppointment(data: unknown): Promise<{ error?: string }> {
  try {
    const user = await requireUserAction();
    const validated = appointmentSchema.parse(data);
    const attendee = await assertAttendee(validated.attendeeId, validated.kind);
    const autoConfirmed = validated.attendeeId === user.id || !attendee.isAdmin;

    await prisma.customerAppointment.create({
      data: {
        ...appointmentData(validated),
        createdById: user.id,
        ...(autoConfirmed
          ? { status: "CONFIRMED", reviewedById: user.id, reviewedAt: new Date() }
          : { status: "PENDING" }),
      },
    });
    revalidatePath("/dashboard");
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

/**
 * Creator or any ADMIN may edit. Changing the date, time or attendee of a
 * CONFIRMED appointment sends it back to PENDING unless the editor is the
 * (new) attendee, who is confirming their own availability by saving, or the
 * (new) attendee is a staff member (no confirmation needed).
 */
export async function updateAppointment(id: string, data: unknown): Promise<{ error?: string }> {
  try {
    const user = await requireUserAction();
    const validated = appointmentSchema.parse(data);
    const existing = await prisma.customerAppointment.findUniqueOrThrow({ where: { id } });
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && existing.createdById !== user.id) {
      throw new Error("แก้ไขได้เฉพาะนัดที่คุณสร้างเอง");
    }
    if (existing.status === "CANCELLED") {
      throw new Error("นัดนี้ถูกยกเลิกแล้ว");
    }
    const attendee = await assertAttendee(validated.attendeeId, validated.kind);

    const next = appointmentData(validated);
    const scheduleChanged =
      next.date.getTime() !== existing.date.getTime() ||
      next.startTime !== existing.startTime ||
      next.endTime !== existing.endTime ||
      next.attendeeId !== existing.attendeeId;

    const noConfirmationNeeded = next.attendeeId === user.id || !attendee.isAdmin;
    let statusPatch = {};
    if (noConfirmationNeeded && existing.status !== "CONFIRMED") {
      statusPatch = { status: "CONFIRMED", reviewedById: user.id, reviewedAt: new Date(), reviewNote: null };
    } else if (scheduleChanged && existing.status !== "PENDING" && !noConfirmationNeeded) {
      statusPatch = { status: "PENDING", reviewedById: null, reviewedAt: null, reviewNote: null };
    }

    await prisma.customerAppointment.update({
      where: { id },
      data: { ...next, ...statusPatch },
    });
    revalidatePath("/dashboard");
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

/** Any ADMIN confirms (ว่าง) or declines (ไม่ว่าง) a pending appointment. */
export async function reviewAppointment(id: string, data: unknown) {
  const admin = await assertAdmin();
  const validated = appointmentReviewSchema.parse(data);
  const appointment = await prisma.customerAppointment.findUniqueOrThrow({ where: { id } });

  if (appointment.status !== "PENDING") {
    throw new Error("นัดนี้ได้รับการยืนยันแล้ว");
  }

  await prisma.customerAppointment.update({
    where: { id },
    data: {
      status: validated.approve ? "CONFIRMED" : "DECLINED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: validated.note?.trim() || null,
    },
  });
  revalidatePath("/dashboard");
}

/** Creator, attendee or any ADMIN may cancel a PENDING/CONFIRMED appointment. */
export async function cancelAppointment(id: string) {
  const user = await requireUserAction();
  const appointment = await prisma.customerAppointment.findUniqueOrThrow({ where: { id } });

  if (
    user.role !== "ADMIN" &&
    appointment.createdById !== user.id &&
    appointment.attendeeId !== user.id
  ) {
    throw new Error("ยกเลิกได้เฉพาะนัดที่คุณสร้างเอง");
  }
  if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
    throw new Error("นัดนี้ไม่สามารถยกเลิกได้");
  }

  await prisma.customerAppointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/dashboard");
}

/**
 * ADMIN removes a cancelled or declined appointment for good (e.g. a test
 * entry). Live appointments must be cancelled first so nothing disappears
 * from the calendar by accident.
 */
export async function deleteAppointment(id: string) {
  await assertAdmin();
  const appointment = await prisma.customerAppointment.findUniqueOrThrow({ where: { id } });

  if (appointment.status !== "CANCELLED" && appointment.status !== "DECLINED") {
    throw new Error("ต้องยกเลิกนัดก่อนจึงจะลบได้");
  }

  await prisma.customerAppointment.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export interface AppointmentCustomerOption {
  id: string;
  code: string;
  customerName: string;
  companyName: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
}

/** Customer search for the appointment dialog (fills name / address). */
export async function searchCustomersForAppointmentAction(
  query: string
): Promise<AppointmentCustomerOption[]> {
  await requireUserAction();
  const rows = await searchCustomers(query.trim());
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    customerName: c.customerName,
    companyName: c.companyName ?? null,
    address: c.address ?? null,
    contactPerson: c.contactPerson ?? null,
    phone: c.phone ?? null,
  }));
}
