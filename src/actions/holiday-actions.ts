"use server";

import { prisma } from "@/lib/prisma";
import { holidaySchema, holidayRangeSchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { toUTCNoon } from "@/lib/thai-date";
import { assertAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

function rethrowDuplicateHoliday(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error("มีวันหยุดชื่อนี้ในวันที่นี้อยู่แล้ว");
  }
  throw err;
}

function eachDay(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const end = toUTCNoon(endDate);
  const current = toUTCNoon(startDate);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export async function createHoliday(data: unknown) {
  await assertAdmin();
  const validated = holidaySchema.parse(data);
  const holiday = await prisma.holiday
    .create({
      data: {
        name: validated.name,
        date: toUTCNoon(validated.date),
        isRecurring: validated.isRecurring,
        type: validated.type,
      },
    })
    .catch(rethrowDuplicateHoliday);
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return serialize(holiday);
}

export async function createHolidayRange(data: unknown) {
  await assertAdmin();
  const validated = holidayRangeSchema.parse(data);
  const dates = eachDay(validated.startDate, validated.endDate);
  await prisma.holiday.createMany({
    data: dates.map((date) => ({
      name: validated.name,
      date,
      isRecurring: validated.isRecurring,
      type: validated.type,
    })),
    // Days that already have this holiday are left as they are (no duplicates)
    skipDuplicates: true,
  });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
}

/**
 * Replaces a multi-day holiday group (the rows `ids`, as grouped on the
 * /holidays table) with the edited name/type/recurrence over the new range.
 */
export async function updateHolidayGroup(ids: string[], data: unknown) {
  await assertAdmin();
  const validated = holidayRangeSchema.parse(data);
  if (ids.length === 0) throw new Error("ไม่พบวันหยุดที่ต้องการแก้ไข");
  const dates = eachDay(validated.startDate, validated.endDate);
  await prisma.$transaction([
    prisma.holiday.deleteMany({ where: { id: { in: ids } } }),
    prisma.holiday.createMany({
      data: dates.map((date) => ({
        name: validated.name,
        date,
        isRecurring: validated.isRecurring,
        type: validated.type,
      })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
}

export async function deleteHoliday(id: string) {
  await assertAdmin();
  await prisma.holiday.delete({ where: { id } });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
}

export async function deleteHolidayGroup(ids: string[]) {
  await assertAdmin();
  await prisma.holiday.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
}
