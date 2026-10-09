import { prisma } from "@/lib/prisma";
import {
  allocateLeaveYear,
  LEAVE_BALANCE_ORDER,
  type LeaveHolidayInput,
  type LeaveTypeBalance,
} from "@/lib/leave-policy";
import { employeeDisplayName, profileNameSelect } from "@/data/payroll";

export interface LeaveBalanceSummary {
  year: number;
  balances: Record<string, LeaveTypeBalance>;
  /** Hours still waiting for approval, per type */
  pendingHours: Record<string, number>;
  /** YYYY-MM-DD annual leave is earned (first anniversary), null = already eligible */
  annualEligibleFrom: string | null;
}

export interface LeaveHistoryItem {
  id: string;
  type: string;
  period: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  reviewNote: string | null;
  /** Hours counted against the quota (working / calendar days per type) */
  hours: number;
  /** Hours beyond the paid quota (APPROVED only) */
  unpaidHours: number;
}

function yearBounds(year: number) {
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31)) };
}

export async function getCompanyHolidaysForYear(year: number): Promise<LeaveHolidayInput[]> {
  const { start, end } = yearBounds(year);
  return prisma.holiday.findMany({
    where: { type: "COMPANY", OR: [{ isRecurring: true }, { date: { gte: start, lte: end } }] },
    select: { date: true, isRecurring: true },
  });
}

type LeaveRow = {
  id: string;
  profileId: string;
  type: string;
  period: string;
  status: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  reviewNote: string | null;
};

function summarize(
  year: number,
  leaves: LeaveRow[],
  holidays: LeaveHolidayInput[],
  salary: { annualLeaveDays: number; startDate: Date | null } | null,
  leaveAlwaysPaid: boolean
) {
  const approved = allocateLeaveYear({
    year,
    leaves: leaves.filter((l) => l.status === "APPROVED"),
    holidays,
    annualLeaveDays: salary?.annualLeaveDays,
    startDate: salary?.startDate,
    leaveAlwaysPaid,
  });
  const pending = allocateLeaveYear({
    year,
    leaves: leaves.filter((l) => l.status === "PENDING"),
    holidays,
  });
  const pendingHours: Record<string, number> = {};
  for (const type of LEAVE_BALANCE_ORDER) pendingHours[type] = pending.balances[type].usedHours;

  const summary: LeaveBalanceSummary = {
    year,
    balances: approved.balances,
    pendingHours,
    annualEligibleFrom: approved.annualEligibleFrom,
  };
  return { summary, approvedDays: approved.days };
}

/** ADMIN leave is never deducted from salary (leaveAlwaysPaid in src/lib/leave-policy.ts). */
async function isAdminProfile(profileId: string): Promise<boolean> {
  const p = await prisma.profile.findUnique({ where: { id: profileId }, select: { role: true } });
  return p?.role === "ADMIN";
}

async function leavesInYear(year: number, profileIds?: string[]) {
  const { start, end } = yearBounds(year);
  return prisma.leaveRequest.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
      startDate: { lte: end },
      endDate: { gte: start },
      ...(profileIds ? { profileId: { in: profileIds } } : {}),
    },
    select: {
      id: true,
      profileId: true,
      type: true,
      period: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
      reviewNote: true,
    },
    orderBy: { startDate: "asc" },
  });
}

/** One employee's balance for the year plus every leave request (any status) in it. */
export async function getMyLeaveSummary(profileId: string, year: number) {
  const { start, end } = yearBounds(year);
  const [salary, holidays, counted, history, isAdmin] = await Promise.all([
    prisma.employeeSalary.findUnique({
      where: { profileId },
      select: { annualLeaveDays: true, startDate: true },
    }),
    getCompanyHolidaysForYear(year),
    leavesInYear(year, [profileId]),
    prisma.leaveRequest.findMany({
      where: { profileId, startDate: { lte: end }, endDate: { gte: start } },
      orderBy: { startDate: "desc" },
    }),
    isAdminProfile(profileId),
  ]);
  const { summary, approvedDays } = summarize(year, counted, holidays, salary, isAdmin);

  const unpaidById = new Map<string, number>();
  for (const day of approvedDays) {
    if (day.leaveId) unpaidById.set(day.leaveId, (unpaidById.get(day.leaveId) ?? 0) + day.unpaidHours);
  }

  const items: LeaveHistoryItem[] = history.map((l) => {
    const hours = allocateLeaveYear({ year, leaves: [l], holidays }).days.reduce((s, d) => s + d.hours, 0);
    return {
      id: l.id,
      type: l.type,
      period: l.period,
      status: l.status,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      reason: l.reason,
      reviewNote: l.reviewNote,
      hours,
      unpaidHours: unpaidById.get(l.id) ?? 0,
    };
  });

  return { summary, history: items, hasSalary: !!salary };
}

export interface TeamLeaveRow {
  profileId: string;
  name: string;
  summary: LeaveBalanceSummary;
}

/** Leave balance of every active employee for the year (admin overview). */
export async function getTeamLeaveBalances(year: number): Promise<TeamLeaveRow[]> {
  const [profiles, holidays, leaves] = await Promise.all([
    prisma.profile.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        role: true,
        ...profileNameSelect,
        employeeSalary: { select: { annualLeaveDays: true, startDate: true } },
      },
    }),
    getCompanyHolidaysForYear(year),
    leavesInYear(year),
  ]);

  const byProfile = new Map<string, LeaveRow[]>();
  for (const l of leaves) {
    const list = byProfile.get(l.profileId) ?? [];
    list.push(l);
    byProfile.set(l.profileId, list);
  }

  return profiles
    .map((p) => ({
      profileId: p.id,
      name: employeeDisplayName(p),
      summary: summarize(year, byProfile.get(p.id) ?? [], holidays, p.employeeSalary, p.role === "ADMIN").summary,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}
