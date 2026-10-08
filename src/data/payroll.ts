import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import {
  calculatePayroll,
  type PayrollAdjustment,
  type PayrollCalcResult,
  type PayrollHolidayInput,
  type PayrollLeaveInput,
} from "@/lib/payroll";

type ProfileName = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  email: string;
};

export const profileNameSelect = {
  firstName: true,
  lastName: true,
  fullName: true,
  username: true,
  email: true,
} as const;

/** Payslips show the real name; username / email only as a fallback. */
export function employeeDisplayName(p: ProfileName): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return name || p.fullName || p.username || p.email;
}

function monthBounds(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

/**
 * Approved leave per profile (from 1 January up to the end of the month, so earlier months
 * use up the yearly quotas) and the year's COMPANY holidays — the inputs of calculatePayroll.
 */
export async function getPayrollMonthInputs(year: number, month: number, profileIds?: string[]) {
  const start = new Date(Date.UTC(year, 0, 1));
  const { end } = monthBounds(year, month);
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const [leaves, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: end },
        endDate: { gte: start },
        ...(profileIds ? { profileId: { in: profileIds } } : {}),
      },
      select: { profileId: true, type: true, period: true, startDate: true, endDate: true },
    }),
    prisma.holiday.findMany({
      where: {
        type: "COMPANY",
        OR: [{ isRecurring: true }, { date: { gte: start, lte: yearEnd } }],
      },
      select: { date: true, isRecurring: true },
    }),
  ]);

  const leavesByProfile = new Map<string, PayrollLeaveInput[]>();
  for (const l of leaves) {
    const list = leavesByProfile.get(l.profileId) ?? [];
    list.push(l);
    leavesByProfile.set(l.profileId, list);
  }
  return { leavesByProfile, holidays: holidays as PayrollHolidayInput[] };
}

/** Recalculate one employee's month from their current salary record and approved leave. */
export async function computePayrollFor(
  profileId: string,
  year: number,
  month: number,
  items: PayrollAdjustment[] = []
): Promise<{ result: PayrollCalcResult; employeeName: string } | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { ...profileNameSelect, employeeSalary: true },
  });
  if (!profile?.employeeSalary) return null;

  const { leavesByProfile, holidays } = await getPayrollMonthInputs(year, month, [profileId]);
  const salary = profile.employeeSalary;
  const result = calculatePayroll({
    year,
    month,
    monthlySalary: Number(salary.monthlySalary),
    startDate: salary.startDate,
    endDate: salary.endDate,
    annualLeaveDays: salary.annualLeaveDays,
    leaves: leavesByProfile.get(profileId) ?? [],
    holidays,
    items,
  });
  return { result, employeeName: employeeDisplayName(profile) };
}

export interface PayrollMonthRow {
  profileId: string;
  name: string;
  username: string | null;
  hasSalary: boolean;
  /** Saved payslip for this month, if any */
  payroll: {
    id: string;
    status: string;
    monthlySalary: number;
    paidDays: number;
    baseAmount: number;
    leaveHours: number;
    unpaidLeaveHours: number;
    leaveDeduction: number;
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
  } | null;
  /** Live calculation (no extra items) when nothing is saved yet */
  preview: PayrollCalcResult | null;
}

export async function getPayrollMonth(year: number, month: number): Promise<PayrollMonthRow[]> {
  const [profiles, payrolls, inputs] = await Promise.all([
    prisma.profile.findMany({
      where: {
        OR: [
          { status: "ACTIVE", employeeSalary: { isNot: null } },
          { payrolls: { some: { year, month } } },
        ],
      },
      select: { id: true, ...profileNameSelect, employeeSalary: true },
    }),
    prisma.payroll.findMany({ where: { year, month } }),
    getPayrollMonthInputs(year, month),
  ]);

  const byProfile = new Map(payrolls.map((p) => [p.profileId, p]));

  const rows: PayrollMonthRow[] = profiles.map((profile) => {
    const saved = byProfile.get(profile.id);
    const salary = profile.employeeSalary;
    const preview =
      !saved && salary
        ? calculatePayroll({
            year,
            month,
            monthlySalary: Number(salary.monthlySalary),
            startDate: salary.startDate,
            endDate: salary.endDate,
            annualLeaveDays: salary.annualLeaveDays,
            leaves: inputs.leavesByProfile.get(profile.id) ?? [],
            holidays: inputs.holidays,
          })
        : null;

    return {
      profileId: profile.id,
      name: saved?.employeeName ?? employeeDisplayName(profile),
      username: profile.username,
      hasSalary: !!salary,
      payroll: saved
        ? {
            id: saved.id,
            status: saved.status,
            monthlySalary: Number(saved.monthlySalary),
            paidDays: saved.paidDays,
            baseAmount: Number(saved.baseAmount),
            leaveHours: Number(saved.leaveHours),
            unpaidLeaveHours: Number(saved.unpaidLeaveHours),
            leaveDeduction: Number(saved.leaveDeduction),
            totalEarnings: Number(saved.totalEarnings),
            totalDeductions: Number(saved.totalDeductions),
            netPay: Number(saved.netPay),
          }
        : null,
      preview,
    };
  });

  // Employees not yet started / already left this month have nothing to pay — hide them
  return rows
    .filter((r) => r.payroll || (r.preview && r.preview.paidDays > 0))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export async function getPayrollById(id: string) {
  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sequence: "asc" } },
      profile: { select: { id: true, ...profileNameSelect, employeeSalary: true } },
    },
  });
  return payroll ? serialize(payroll) : null;
}

export interface EmployeeSalaryRow {
  profileId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  monthlySalary: number | null;
  startDate: string | null;
  endDate: string | null;
  annualLeaveDays: number | null;
  notes: string | null;
}

export async function getEmployeeSalaries(): Promise<EmployeeSalaryRow[]> {
  const profiles = await prisma.profile.findMany({
    select: { id: true, role: true, status: true, ...profileNameSelect, employeeSalary: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return profiles.map((p) => ({
    profileId: p.id,
    name: employeeDisplayName(p),
    email: p.email,
    role: p.role,
    status: p.status,
    monthlySalary: p.employeeSalary ? Number(p.employeeSalary.monthlySalary) : null,
    startDate: p.employeeSalary?.startDate?.toISOString() ?? null,
    endDate: p.employeeSalary?.endDate?.toISOString() ?? null,
    annualLeaveDays: p.employeeSalary?.annualLeaveDays ?? null,
    notes: p.employeeSalary?.notes ?? null,
  }));
}

/** An employee's own CONFIRMED payslips, newest first (บัญชีของฉัน). */
export async function getMyPayslips(profileId: string) {
  const payrolls = await prisma.payroll.findMany({
    where: { profileId, status: "CONFIRMED" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: {
      id: true,
      year: true,
      month: true,
      netPay: true,
      leaveDeduction: true,
      confirmedAt: true,
    },
  });
  return payrolls.map((p) => ({
    id: p.id,
    year: p.year,
    month: p.month,
    netPay: Number(p.netPay),
    leaveDeduction: Number(p.leaveDeduction),
  }));
}
