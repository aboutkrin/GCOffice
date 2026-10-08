/**
 * Payroll math (pure, no DB). Shared by src/data/payroll.ts and src/actions/payroll-actions.ts.
 *
 * - Every month counts as 30 days: daily rate = salary ÷ 30, whatever the month length.
 *   A full month pays the full salary; a partial month (start/end date inside it) pays
 *   daily rate × calendar days worked (Sundays are NOT removed), capped at 30.
 * - Office hours 9:00–18:00 with a 1-hour lunch = 8 paid hours: hourly rate = daily ÷ 8.
 * - Every APPROVED leave is deducted by the hour: FULL_DAY 8h, MORNING (9–12) 3h,
 *   AFTERNOON (13–18) 5h. Sundays and COMPANY holidays inside a leave are not deducted
 *   (the office is closed those days anyway).
 */

export const PAYROLL_DAYS_PER_MONTH = 30;
export const PAYROLL_HOURS_PER_DAY = 8;

export const LEAVE_PERIOD_HOURS: Record<string, number> = {
  FULL_DAY: 8,
  MORNING: 3,
  AFTERNOON: 5,
};

export interface PayrollLeaveInput {
  type: string;
  period: string;
  startDate: Date | string;
  endDate: Date | string;
}

export interface PayrollHolidayInput {
  date: Date | string;
  isRecurring: boolean;
}

export interface PayrollLeaveDetail {
  /** YYYY-MM-DD */
  date: string;
  type: string;
  period: string;
  hours: number;
}

export interface PayrollAdjustment {
  kind: "EARNING" | "DEDUCTION";
  name: string;
  amount: number;
}

export interface PayrollCalcInput {
  year: number;
  /** 1–12 */
  month: number;
  monthlySalary: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  leaves: PayrollLeaveInput[];
  holidays: PayrollHolidayInput[];
  items?: PayrollAdjustment[];
}

export interface PayrollCalcResult {
  monthlySalary: number;
  dailyRate: number;
  hourlyRate: number;
  daysInMonth: number;
  /** First/last calendar day paid this month (YYYY-MM-DD), null when nothing is paid */
  periodStart: string | null;
  periodEnd: string | null;
  paidDays: number;
  baseAmount: number;
  leaveHours: number;
  leaveDeduction: number;
  leaveDetails: PayrollLeaveDetail[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
}

const DAY_MS = 86_400_000;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Calendar date of a date-only value as a UTC-midnight timestamp (DB DATE columns come back as UTC midnight). */
function dayStamp(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function stampKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function sumAdjustments(items: PayrollAdjustment[] = []) {
  let totalEarnings = 0;
  let totalDeductions = 0;
  for (const item of items) {
    if (item.kind === "EARNING") totalEarnings += item.amount;
    else totalDeductions += item.amount;
  }
  return { totalEarnings: round2(totalEarnings), totalDeductions: round2(totalDeductions) };
}

export function calculatePayroll(input: PayrollCalcInput): PayrollCalcResult {
  const { year, month, monthlySalary } = input;
  const dim = daysInMonth(year, month);
  const monthStart = Date.UTC(year, month - 1, 1);
  const monthEnd = Date.UTC(year, month - 1, dim);

  const from = Math.max(monthStart, input.startDate ? dayStamp(input.startDate) : monthStart);
  const to = Math.min(monthEnd, input.endDate ? dayStamp(input.endDate) : monthEnd);
  const employed = from <= to;

  const dailyRate = monthlySalary / PAYROLL_DAYS_PER_MONTH;
  const hourlyRate = dailyRate / PAYROLL_HOURS_PER_DAY;

  let paidDays = 0;
  if (employed) {
    const fullMonth = from === monthStart && to === monthEnd;
    const calendarDays = Math.round((to - from) / DAY_MS) + 1;
    paidDays = fullMonth ? PAYROLL_DAYS_PER_MONTH : Math.min(calendarDays, PAYROLL_DAYS_PER_MONTH);
  }
  const baseAmount =
    paidDays === PAYROLL_DAYS_PER_MONTH ? round2(monthlySalary) : round2(dailyRate * paidDays);

  const holidayKeys = new Set<string>();
  const recurringKeys = new Set<string>();
  for (const h of input.holidays) {
    const key = stampKey(dayStamp(h.date));
    if (h.isRecurring) recurringKeys.add(key.slice(5));
    else holidayKeys.add(key);
  }

  // One entry per day; if two leaves overlap a day, the longer one wins.
  const byDay = new Map<string, PayrollLeaveDetail>();
  if (employed) {
    for (const leave of input.leaves) {
      const hours = LEAVE_PERIOD_HOURS[leave.period] ?? PAYROLL_HOURS_PER_DAY;
      const start = Math.max(from, dayStamp(leave.startDate));
      const end = Math.min(to, dayStamp(leave.endDate));
      for (let t = start; t <= end; t += DAY_MS) {
        if (new Date(t).getUTCDay() === 0) continue;
        const key = stampKey(t);
        if (holidayKeys.has(key) || recurringKeys.has(key.slice(5))) continue;
        const existing = byDay.get(key);
        if (!existing || existing.hours < hours) {
          byDay.set(key, { date: key, type: leave.type, period: leave.period, hours });
        }
      }
    }
  }
  const leaveDetails = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  const leaveHours = leaveDetails.reduce((sum, d) => sum + d.hours, 0);
  const leaveDeduction = round2(hourlyRate * leaveHours);

  const { totalEarnings, totalDeductions } = sumAdjustments(input.items);
  const netPay = round2(baseAmount - leaveDeduction + totalEarnings - totalDeductions);

  return {
    monthlySalary,
    dailyRate,
    hourlyRate,
    daysInMonth: dim,
    periodStart: employed ? stampKey(from) : null,
    periodEnd: employed ? stampKey(to) : null,
    paidDays,
    baseAmount,
    leaveHours,
    leaveDeduction,
    leaveDetails,
    totalEarnings,
    totalDeductions,
    netPay,
  };
}
