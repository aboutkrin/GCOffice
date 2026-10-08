/**
 * Holidays are stored one row per day. The /holidays table and the edit page
 * show consecutive days with the same name, type and recurrence as one group
 * (e.g. "วันตรุษจีน 9–15 ก.พ."), so a multi-day holiday is edited as a whole.
 */

export interface HolidayGroup {
  ids: string[];
  name: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  type: string;
}

interface HolidayRow {
  id: string;
  name: string;
  date: string | Date;
  isRecurring: boolean;
  type: string;
}

/** `holidays` must be sorted by date ascending (as `getHolidays()` returns). */
export function groupHolidays(holidays: HolidayRow[]): HolidayGroup[] {
  if (holidays.length === 0) return [];
  const iso = (d: string | Date) => new Date(d).toISOString();

  const groups: HolidayGroup[] = [];
  let current: HolidayGroup = {
    ids: [holidays[0].id],
    name: holidays[0].name,
    startDate: iso(holidays[0].date),
    endDate: iso(holidays[0].date),
    isRecurring: holidays[0].isRecurring,
    type: holidays[0].type,
  };

  for (let i = 1; i < holidays.length; i++) {
    const h = holidays[i];
    const prevDate = new Date(current.endDate);
    const currDate = new Date(h.date);
    const diffMs = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Allow merging for same date (duplicates, diffDays=0) or consecutive date (diffDays=1)
    if (
      h.name === current.name &&
      h.isRecurring === current.isRecurring &&
      h.type === current.type &&
      diffDays >= 0 &&
      diffDays <= 1
    ) {
      current.ids.push(h.id);
      current.endDate = iso(h.date);
    } else {
      groups.push(current);
      current = {
        ids: [h.id],
        name: h.name,
        startDate: iso(h.date),
        endDate: iso(h.date),
        isRecurring: h.isRecurring,
        type: h.type,
      };
    }
  }
  groups.push(current);

  return groups;
}

export function getDayCount(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}
