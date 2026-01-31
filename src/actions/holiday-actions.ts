"use server";

import { prisma } from "@/lib/prisma";
import { holidaySchema, holidayRangeSchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createHoliday(data: unknown) {
  const validated = holidaySchema.parse(data);
  const holiday = await prisma.holiday.create({
    data: {
      name: validated.name,
      date: validated.date,
      isRecurring: validated.isRecurring,
    },
  });
  revalidatePath("/holidays");
  return serialize(holiday);
}

export async function createHolidayRange(data: unknown) {
  const validated = holidayRangeSchema.parse(data);
  const dates: Date[] = [];
  const current = new Date(validated.startDate);
  const end = new Date(validated.endDate);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  await prisma.holiday.createMany({
    data: dates.map((date) => ({
      name: validated.name,
      date,
      isRecurring: validated.isRecurring,
    })),
  });
  revalidatePath("/holidays");
}

export async function updateHoliday(id: string, data: unknown) {
  const validated = holidaySchema.parse(data);
  const holiday = await prisma.holiday.update({
    where: { id },
    data: {
      name: validated.name,
      date: validated.date,
      isRecurring: validated.isRecurring,
    },
  });
  revalidatePath("/holidays");
  return serialize(holiday);
}

export async function deleteHoliday(id: string) {
  await prisma.holiday.delete({ where: { id } });
  revalidatePath("/holidays");
}
