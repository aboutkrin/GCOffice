import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getHolidays() {
  try {
    const data = await prisma.holiday.findMany({
      orderBy: { date: "asc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getHolidayById(id: string) {
  try {
    const data = await prisma.holiday.findUnique({
      where: { id },
    });
    return serialize(data);
  } catch {
    return null;
  }
}

export async function getActiveHolidays() {
  try {
    const data = await prisma.holiday.findMany({
      orderBy: { date: "asc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}
