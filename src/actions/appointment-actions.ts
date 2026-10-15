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

async function assertAttendeeIsAdmin(attendeeId: string) {
  const attendee = await prisma.profile.findUnique({
    where: { id: attendeeId },
    select: { role: true, status: true },
  });
  if (!attendee || attendee.role !== "ADMIN" || attendee.status !== "ACTIVE") {
    throw new Error("ผู้ไปพบลูกค้าต้องเป็นแอดมินที่ยังใช้งานอยู่");
  }
}

/**
 * Anyone may book a customer visit for an admin. If the booker is that admin
 * the appointment is CONFIRMED at once; otherwise it waits (PENDING) until an
 * admin confirms they are free.
 */
export async function createAppointment(data: unknown): Promise<{ error?: string }> {
  try {
    const user = await requireUserAction();
    const validated = appointmentSchema.parse(data);
    await assertAttendeeIsAdmin(validated.attendeeId);
    const selfBooked = validated.attendeeId === user.id;

    await prisma.customerAppointment.create({
      data: {
        ...appointmentData(validated),
        createdById: user.id,
        ...(selfBooked
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
 * (new) attendee, who is confirming their own availability by saving.
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
    await assertAttendeeIsAdmin(validated.attendeeId);

    const next = appointmentData(validated);
    const scheduleChanged =
      next.date.getTime() !== existing.date.getTime() ||
      next.startTime !== existing.startTime ||
      next.endTime !== existing.endTime ||
      next.attendeeId !== existing.attendeeId;

    let statusPatch = {};
    if (next.attendeeId === user.id && existing.status !== "CONFIRMED") {
      statusPatch = { status: "CONFIRMED", reviewedById: user.id, reviewedAt: new Date(), reviewNote: null };
    } else if (scheduleChanged && existing.status !== "PENDING" && next.attendeeId !== user.id) {
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
