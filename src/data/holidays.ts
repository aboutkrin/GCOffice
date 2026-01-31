import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getHolidays() {
  const data = await prisma.holiday.findMany({
    orderBy: { date: "asc" },
  });
  return serialize(data);
}

export async function getHolidayById(id: string) {
  const data = await prisma.holiday.findUnique({
    where: { id },
  });
  return serialize(data);
}

export async function getActiveHolidays() {
  const data = await prisma.holiday.findMany({
    orderBy: { date: "asc" },
  });
  return serialize(data);
}
