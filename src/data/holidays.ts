import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { groupHolidays } from "@/lib/holiday-groups";

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

/**
 * The multi-day group (same grouping as the /holidays table) that contains
 * the holiday `id`, so the edit page edits the whole range at once.
 */
export async function getHolidayGroupById(id: string) {
  const groups = groupHolidays(await getHolidays());
  return groups.find((g) => g.ids.includes(id)) ?? null;
}

/**
 * Holidays skipped by delivery-date math. Includes PUBLIC and CHINA holidays
 * too: even when the office works, carriers are closed (or China doesn't ship)
 * so deliveries are pushed back.
 */
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
