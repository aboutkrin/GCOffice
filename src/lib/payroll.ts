/**
 * Payroll math (pure, no DB). Shared by src/data/payroll.ts and src/actions/payroll-actions.ts.
 *
 * - Every month counts as 30 days: daily rate = salary ÷ 30, whatever the month length.
 *   A full month pays the full salary; a partial month (start/end date inside it) pays
 *   daily rate × calendar days worked (Sundays are NOT removed), capped at 30.
 * - Office hours 9:00–18:00 with a 1-hour lunch = 8 paid hours: hourly rate = daily ÷ 8.
 * - APPROVED leave is counted by the hour (FULL_DAY 8h, MORNING 3h, AFTERNOON 5h) and split
 *   into paid / unpaid hours against the yearly quotas in src/lib/leave-policy.ts. Only the
 *   unpaid hours (beyond the quota, or unpaid leave types) are deducted. The leaves passed
 *   in must cover the whole year up to the end of the month so earlier months use up quota.
 *   ADMIN profiles (leaveAlwaysPaid) never have leave deducted.
 */

import {
  LEAVE_PERIOD_HOURS,
  allocateLeaveYear,
  dayStamp,
  stampKey,
  type LeaveHolidayInput,
  type LeaveInput,
} from "@/lib/leave-policy";

export { LEAVE_PERIOD_HOURS };

export const PAYROLL_DAYS_PER_MONTH = 30;
export const PAYROLL_HOURS_PER_DAY = 8;

export type PayrollLeaveInput = LeaveInput;
export type PayrollHolidayInput = LeaveHolidayInput;

export interface PayrollLeaveDetail {
  /** YYYY-MM-DD */
  date: string;
  type: string;
  period: string;
  hours: number;
  /** Missing on payslips saved before leave quotas — treat the whole day as unpaid */
  paidHours?: number;
  unpaidHours?: number;
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
  /** Paid annual leave days per year (EmployeeSalary.annualLeaveDays) */
  annualLeaveDays?: number | null;
  /** Approved leave from 1 January of the year up to the end of the month */
  leaves: PayrollLeaveInput[];
  /** ADMIN: leave is recorded but never deducted */
  leaveAlwaysPaid?: boolean;
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
  unpaidLeaveHours: number;
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

/** Unpaid (deducted) hours of a saved leave day; payslips saved before quotas deducted every hour. */
export function leaveDetailUnpaidHours(d: PayrollLeaveDetail): number {
  return d.unpaidHours ?? d.hours;
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

  const fromKey = stampKey(from);
  const toKey = stampKey(to);
  const leaveDetails = employed
    ? allocateLeaveYear({
        year,
        leaves: input.leaves,
        holidays: input.holidays,
        annualLeaveDays: input.annualLeaveDays,
        startDate: input.startDate,
        leaveAlwaysPaid: input.leaveAlwaysPaid,
      }).days.filter((d) => d.date >= fromKey && d.date <= toKey)
    : [];
  const leaveHours = leaveDetails.reduce((sum, d) => sum + d.hours, 0);
  const unpaidLeaveHours = leaveDetails.reduce((sum, d) => sum + d.unpaidHours, 0);
  const leaveDeduction = round2(hourlyRate * unpaidLeaveHours);

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
    unpaidLeaveHours,
    leaveDeduction,
    leaveDetails,
    totalEarnings,
    totalDeductions,
    netPay,
  };
}
