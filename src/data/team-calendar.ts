import { prisma } from "@/lib/prisma";
import { getHolidaysForMonth, type HolidayItem } from "@/data/dashboard";

export interface CalendarLeaveItem {
  id: string;
  profileId: string;
  profileName: string;
  type: string;
  period: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  reviewNote: string | null;
}

export interface CalendarShipmentItem {
  id: string;
  title: string;
  containerNo: string | null;
  supplier: string | null;
  status: string;
  shippedDate: string;
  etaDate: string | null;
  arrivedDate: string | null;
  receivedDate: string | null;
  note: string | null;
  imageUrls: string[];
}

export interface TeamCalendarData {
  holidays: HolidayItem[];
  leaves: CalendarLeaveItem[];
  shipments: CalendarShipmentItem[];
}

export interface TeamMemberOption {
  id: string;
  name: string;
}

type ProfileName = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  email: string;
};

const profileNameSelect = {
  firstName: true,
  lastName: true,
  fullName: true,
  username: true,
  email: true,
} as const;

/** Team calendar shows people by their username; real name / email only as a fallback. */
export function profileDisplayName(p: ProfileName): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return p.username || name || p.fullName || p.email;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

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
  profile: ProfileName;
};

function toLeaveItem(l: LeaveRow): CalendarLeaveItem {
  return {
    id: l.id,
    profileId: l.profileId,
    profileName: profileDisplayName(l.profile),
    type: l.type,
    period: l.period,
    status: l.status,
    startDate: l.startDate.toISOString(),
    endDate: l.endDate.toISOString(),
    reason: l.reason,
    reviewNote: l.reviewNote,
  };
}

type ShipmentRow = {
  id: string;
  title: string;
  containerNo: string | null;
  supplier: string | null;
  status: string;
  shippedDate: Date;
  etaDate: Date | null;
  arrivedDate: Date | null;
  receivedDate: Date | null;
  note: string | null;
  imageUrls: string[];
};

function toShipmentItem(s: ShipmentRow): CalendarShipmentItem {
  return {
    id: s.id,
    title: s.title,
    containerNo: s.containerNo,
    supplier: s.supplier,
    status: s.status,
    shippedDate: s.shippedDate.toISOString(),
    etaDate: iso(s.etaDate),
    arrivedDate: iso(s.arrivedDate),
    receivedDate: iso(s.receivedDate),
    note: s.note,
    imageUrls: s.imageUrls,
  };
}

const leaveSelect = {
  id: true,
  profileId: true,
  type: true,
  period: true,
  status: true,
  startDate: true,
  endDate: true,
  reason: true,
  reviewNote: true,
  profile: { select: profileNameSelect },
} as const;

/**
 * Everything shown on the dashboard team calendar for one month:
 * company holidays, approved + pending leave (pending is rendered faded so
 * the team can plan around it) and China shipment milestones.
 */
export async function getTeamCalendar(
  year: number,
  month: number
): Promise<TeamCalendarData> {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const inMonth = { gte: startOfMonth, lte: endOfMonth };

  const [holidays, leaves, shipments] = await Promise.all([
    getHolidaysForMonth(year, month),
    prisma.leaveRequest
      .findMany({
        where: {
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        select: leaveSelect,
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
    prisma.chinaShipment
      .findMany({
        where: {
          status: { not: "CANCELLED" },
          OR: [
            { shippedDate: inMonth },
            { etaDate: inMonth },
            { arrivedDate: inMonth },
            { receivedDate: inMonth },
          ],
        },
        orderBy: { shippedDate: "asc" },
      })
      .catch(() => []),
  ]);

  return {
    holidays,
    leaves: leaves.map(toLeaveItem),
    shipments: shipments.map(toShipmentItem),
  };
}

/** Shipments still on the way (not yet received into the warehouse), soonest ETA first. */
export async function getUpcomingShipments(): Promise<CalendarShipmentItem[]> {
  try {
    const rows = await prisma.chinaShipment.findMany({
      where: { status: { in: ["SHIPPED", "ARRIVED_TH"] } },
      orderBy: [{ etaDate: { sort: "asc", nulls: "last" } }, { shippedDate: "asc" }],
      take: 20,
    });
    return rows.map(toShipmentItem);
  } catch {
    return [];
  }
}

export async function getPendingLeaves(): Promise<CalendarLeaveItem[]> {
  try {
    const rows = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      select: leaveSelect,
      orderBy: { startDate: "asc" },
    });
    return rows.map(toLeaveItem);
  } catch {
    return [];
  }
}

/** Active users an admin can record leave for. */
export async function getTeamMembers(): Promise<TeamMemberOption[]> {
  try {
    const rows = await prisma.profile.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, ...profileNameSelect },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((p) => ({ id: p.id, name: profileDisplayName(p) }));
  } catch {
    return [];
  }
}

/** The viewer's own leave from the last 30 days onward, so STAFF also see rejected requests. */
export async function getMyLeaves(profileId: string): Promise<CalendarLeaveItem[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  try {
    const rows = await prisma.leaveRequest.findMany({
      where: { profileId, status: { not: "CANCELLED" }, endDate: { gte: since } },
      select: leaveSelect,
      orderBy: { startDate: "asc" },
      take: 10,
    });
    return rows.map(toLeaveItem);
  } catch {
    return [];
  }
}
