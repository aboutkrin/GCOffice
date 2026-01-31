"use server";

import { prisma } from "@/lib/prisma";
import { holidaySchema } from "@/lib/validators";
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
