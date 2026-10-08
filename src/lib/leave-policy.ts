/**
 * Leave quotas (pure, no DB) — Thai Labour Protection Act defaults.
 * Shared by payroll (src/lib/payroll.ts) and the leave balance views (src/data/leave-balances.ts).
 *
 * - The leave year is the calendar year (Jan–Dec); quotas reset on 1 January.
 * - Leave is counted in hours: FULL_DAY 8h, MORNING (9–12) 3h, AFTERNOON (13–18) 5h.
 * - Working-day types skip Sundays and COMPANY holidays; calendar-day types (maternity,
 *   military) count every day.
 * - Days consume the paid quota of their type in date order; hours beyond it are unpaid
 *   and are what payroll deducts.
 * - ANNUAL: EmployeeSalary.annualLeaveDays per year, earned from the first anniversary of
 *   startDate (no startDate = already eligible). Annual leave taken before that is unpaid.
 */

export const LEAVE_HOURS_PER_DAY = 8;

export const LEAVE_PERIOD_HOURS: Record<string, number> = {
  FULL_DAY: 8,
  MORNING: 3,
  AFTERNOON: 5,
};

export const DEFAULT_ANNUAL_LEAVE_DAYS = 6;

export interface LeavePolicy {
  /** Days allowed per year; null = no limit */
  quotaDays: number | null;
  /** Days paid per year; null = every day is paid */
  paidDays: number | null;
  /** Count every calendar day (incl. Sundays and holidays) instead of working days */
  calendarDays: boolean;
  /** Short legal note shown next to the balance */
  note?: string;
}

/** ANNUAL quota/paid days come from the employee (annualLeaveDays); the values here are placeholders. */
export const LEAVE_POLICIES: Record<string, LeavePolicy> = {
  SICK: { quotaDays: 30, paidDays: 30, calendarDays: false, note: "ลา 3 วันทำงานขึ้นไป ขอใบรับรองแพทย์ได้" },
  PERSONAL: { quotaDays: 3, paidDays: 3, calendarDays: false },
  ANNUAL: {
    quotaDays: DEFAULT_ANNUAL_LEAVE_DAYS,
    paidDays: DEFAULT_ANNUAL_LEAVE_DAYS,
    calendarDays: false,
    note: "ได้สิทธิ์เมื่อทำงานครบ 1 ปี",
  },
  MATERNITY: { quotaDays: 120, paidDays: 60, calendarDays: true, note: "นับวันหยุดด้วย ได้ค่าจ้างไม่เกิน 60 วัน" },
  PATERNITY: { quotaDays: 15, paidDays: 15, calendarDays: false },
  CHILDCARE: { quotaDays: 15, paidDays: 0, calendarDays: false, note: "นายจ้างไม่จ่ายค่าจ้าง" },
  STERILIZATION: { quotaDays: null, paidDays: null, calendarDays: false, note: "ตามระยะเวลาที่แพทย์กำหนด" },
  MILITARY: { quotaDays: null, paidDays: 60, calendarDays: true, note: "ได้ค่าจ้างไม่เกิน 60 วันต่อปี" },
  OTHER: { quotaDays: null, paidDays: 0, calendarDays: false, note: "ไม่ได้รับค่าจ้าง" },
};

/** Order used by every balance view */
export const LEAVE_BALANCE_ORDER = [
  "SICK",
  "PERSONAL",
  "ANNUAL",
  "MATERNITY",
  "PATERNITY",
  "CHILDCARE",
  "STERILIZATION",
  "MILITARY",
  "OTHER",
] as const;

/** Types always shown on balance cards; the rest only once used */
export const LEAVE_MAIN_TYPES = ["SICK", "PERSONAL", "ANNUAL"] as const;

export interface LeaveInput {
  /** Carried to the allocated days (leaveId) when given */
  id?: string;
  type: string;
  period: string;
  startDate: Date | string;
  endDate: Date | string;
}

export interface LeaveHolidayInput {
  date: Date | string;
  isRecurring: boolean;
}

export interface LeaveDayAllocation {
  /** YYYY-MM-DD */
  date: string;
  leaveId?: string;
  type: string;
  period: string;
  hours: number;
  paidHours: number;
  unpaidHours: number;
}

export interface LeaveTypeBalance {
  type: string;
  /** null = no limit */
  quotaHours: number | null;
  /** null = every hour is paid */
  paidQuotaHours: number | null;
  usedHours: number;
  paidHours: number;
  unpaidHours: number;
  /** Hours left before the limit (quota, else paid quota); null = no limit */
  remainingHours: number | null;
}

export interface LeaveYearAllocation {
  year: number;
  days: LeaveDayAllocation[];
  balances: Record<string, LeaveTypeBalance>;
  /** YYYY-MM-DD the employee earns annual leave (first anniversary); null = already eligible */
  annualEligibleFrom: string | null;
}

export interface LeaveYearInput {
  year: number;
  leaves: LeaveInput[];
  holidays: LeaveHolidayInput[];
  annualLeaveDays?: number | null;
  /** Employment start (EmployeeSalary.startDate) — annual leave starts one year later */
  startDate?: Date | string | null;
}

const DAY_MS = 86_400_000;

/** Calendar date of a date-only value as a UTC-midnight timestamp (DB DATE columns come back as UTC midnight). */
export function dayStamp(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function stampKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Returns a predicate telling whether a YYYY-MM-DD key is a company holiday. */
export function holidayMatcher(holidays: LeaveHolidayInput[]) {
  const exact = new Set<string>();
  const recurring = new Set<string>();
  for (const h of holidays) {
    const key = stampKey(dayStamp(h.date));
    if (h.isRecurring) recurring.add(key.slice(5));
    else exact.add(key);
  }
  return (key: string) => exact.has(key) || recurring.has(key.slice(5));
}

function annualEligibleStamp(startDate?: Date | string | null): number | null {
  if (!startDate) return null;
  const s = new Date(dayStamp(startDate));
  return Date.UTC(s.getUTCFullYear() + 1, s.getUTCMonth(), s.getUTCDate());
}

/** Policy for one employee: ANNUAL uses their own annualLeaveDays. */
export function leavePolicyFor(type: string, annualLeaveDays?: number | null): LeavePolicy {
  const policy = LEAVE_POLICIES[type] ?? LEAVE_POLICIES.OTHER;
  if (type !== "ANNUAL") return policy;
  const days = annualLeaveDays ?? DEFAULT_ANNUAL_LEAVE_DAYS;
  return { ...policy, quotaDays: days, paidDays: days };
}

/**
 * Leave days of one employee in one calendar year, each split into paid / unpaid hours,
 * plus the balance per leave type.
 */
export function allocateLeaveYear(input: LeaveYearInput): LeaveYearAllocation {
  const { year } = input;
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year, 11, 31);
  const isHoliday = holidayMatcher(input.holidays);
  const eligible = annualEligibleStamp(input.startDate);

  // Annual leave earned only from the anniversary inside (or before) this year
  const annualQuotaDays = eligible !== null && eligible > yearEnd ? 0 : input.annualLeaveDays ?? DEFAULT_ANNUAL_LEAVE_DAYS;

  // One entry per day; if two leaves overlap a day, the longer one wins.
  const byDay = new Map<string, Omit<LeaveDayAllocation, "paidHours" | "unpaidHours">>();
  for (const leave of input.leaves) {
    const policy = LEAVE_POLICIES[leave.type] ?? LEAVE_POLICIES.OTHER;
    const hours = LEAVE_PERIOD_HOURS[leave.period] ?? LEAVE_HOURS_PER_DAY;
    const start = Math.max(yearStart, dayStamp(leave.startDate));
    const end = Math.min(yearEnd, dayStamp(leave.endDate));
    for (let t = start; t <= end; t += DAY_MS) {
      const key = stampKey(t);
      if (!policy.calendarDays && (new Date(t).getUTCDay() === 0 || isHoliday(key))) continue;
      const existing = byDay.get(key);
      if (!existing || existing.hours < hours) {
        byDay.set(key, {
          date: key,
          ...(leave.id ? { leaveId: leave.id } : {}),
          type: leave.type,
          period: leave.period,
          hours,
        });
      }
    }
  }

  const balances: Record<string, LeaveTypeBalance> = {};
  for (const type of LEAVE_BALANCE_ORDER) {
    const policy = type === "ANNUAL" ? { ...LEAVE_POLICIES.ANNUAL, quotaDays: annualQuotaDays, paidDays: annualQuotaDays } : LEAVE_POLICIES[type];
    balances[type] = {
      type,
      quotaHours: policy.quotaDays === null ? null : policy.quotaDays * LEAVE_HOURS_PER_DAY,
      paidQuotaHours: policy.paidDays === null ? null : policy.paidDays * LEAVE_HOURS_PER_DAY,
      usedHours: 0,
      paidHours: 0,
      unpaidHours: 0,
      remainingHours: null,
    };
  }

  const days: LeaveDayAllocation[] = [];
  // Annual leave taken before the anniversary is unpaid and does not use up the entitlement
  let annualBeforeEligibleHours = 0;
  for (const day of [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const balance = balances[day.type] ?? balances.OTHER;
    let paidLeft =
      balance.paidQuotaHours === null ? Infinity : Math.max(0, balance.paidQuotaHours - balance.paidHours);
    const beforeEligible = day.type === "ANNUAL" && eligible !== null && dayStamp(day.date) < eligible;
    if (beforeEligible) {
      paidLeft = 0;
      annualBeforeEligibleHours += day.hours;
    }
    const paidHours = Math.min(day.hours, paidLeft);
    const unpaidHours = day.hours - paidHours;
    balance.usedHours += day.hours;
    balance.paidHours += paidHours;
    balance.unpaidHours += unpaidHours;
    days.push({ ...day, paidHours, unpaidHours });
  }

  for (const balance of Object.values(balances)) {
    const limit = balance.quotaHours ?? balance.paidQuotaHours;
    const counted = balance.usedHours - (balance.type === "ANNUAL" ? annualBeforeEligibleHours : 0);
    balance.remainingHours = limit === null ? null : Math.max(0, limit - counted);
  }

  return {
    year,
    days,
    balances,
    annualEligibleFrom: eligible !== null && eligible > yearStart ? stampKey(eligible) : null,
  };
}

/** Hours of leave the request would add (working days / calendar days per its type). */
export function leaveRequestHours(leave: LeaveInput, holidays: LeaveHolidayInput[]): number {
  return allocateLeaveYear({
    year: new Date(dayStamp(leave.startDate)).getUTCFullYear(),
    leaves: [leave],
    holidays,
  }).days.reduce((sum, d) => sum + d.hours, 0);
}

/** "2 วัน 3 ชม." / "5 วัน" / "3 ชม." — hours shown as 8-hour days */
export function formatLeaveHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  const days = Math.floor(rounded / LEAVE_HOURS_PER_DAY);
  const rest = Math.round((rounded - days * LEAVE_HOURS_PER_DAY) * 100) / 100;
  if (days === 0 && rest === 0) return "0 วัน";
  if (rest === 0) return `${days} วัน`;
  if (days === 0) return `${rest} ชม.`;
  return `${days} วัน ${rest} ชม.`;
}
