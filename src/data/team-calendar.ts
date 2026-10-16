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

export interface CalendarAppointmentItem {
  id: string;
  /** VISIT_CUSTOMER (we go to them) | SHOWROOM (they come to us) | PICKUP (they collect goods) */
  kind: string;
  companyName: string;
  customerId: string | null;
  /** PICKUP: the confirmed quotation being collected */
  documentId: string | null;
  documentNumber: string | null;
  documentItems: { name: string; quantity: number }[];
  /** PICKUP: sample photos of the goods being collected (colour photo → line snapshot → product photo), deduped */
  documentImageUrls: string[];
  location: string | null;
  mapUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  /** ISO date (UTC noon) */
  date: string;
  /** "HH:mm" */
  startTime: string;
  endTime: string | null;
  note: string | null;
  attendeeId: string;
  attendeeName: string;
  createdById: string;
  createdByName: string;
  status: string;
  reviewNote: string | null;
}

export interface TeamCalendarData {
  holidays: HolidayItem[];
  leaves: CalendarLeaveItem[];
  shipments: CalendarShipmentItem[];
  appointments: CalendarAppointmentItem[];
}

export interface TeamMemberOption {
  id: string;
  name: string;
}

export interface AppointmentAttendeeOption extends TeamMemberOption {
  role: "ADMIN" | "STAFF";
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

type AppointmentRow = {
  id: string;
  kind: string;
  companyName: string;
  customerId: string | null;
  documentId: string | null;
  document: {
    id: string;
    documentNumber: string | null;
    lineItems: {
      productName: string;
      productImage: string | null;
      colorVariantName: string | null;
      quantity: number;
      product: { imageUrl: string | null } | null;
      colorVariant: { imageUrl: string | null } | null;
    }[];
  } | null;
  location: string | null;
  mapUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  date: Date;
  startTime: string;
  endTime: string | null;
  note: string | null;
  attendeeId: string;
  createdById: string;
  status: string;
  reviewNote: string | null;
  attendee: ProfileName;
  createdBy: ProfileName;
};

function toAppointmentItem(a: AppointmentRow): CalendarAppointmentItem {
  return {
    id: a.id,
    kind: a.kind,
    companyName: a.companyName,
    customerId: a.customerId,
    documentId: a.document?.id ?? null,
    documentNumber: a.document?.documentNumber ?? null,
    documentItems: (a.document?.lineItems ?? []).map((li) => ({
      name: li.colorVariantName ? `${li.productName} (${li.colorVariantName})` : li.productName,
      quantity: li.quantity,
    })),
    documentImageUrls: Array.from(
      new Set(
        (a.document?.lineItems ?? [])
          .map((li) => li.colorVariant?.imageUrl || li.productImage || li.product?.imageUrl || null)
          .filter((url): url is string => !!url)
      )
    ),
    location: a.location,
    mapUrl: a.mapUrl,
    contactName: a.contactName,
    contactPhone: a.contactPhone,
    date: a.date.toISOString(),
    startTime: a.startTime,
    endTime: a.endTime,
    note: a.note,
    attendeeId: a.attendeeId,
    attendeeName: profileDisplayName(a.attendee),
    createdById: a.createdById,
    createdByName: profileDisplayName(a.createdBy),
    status: a.status,
    reviewNote: a.reviewNote,
  };
}

const appointmentSelect = {
  id: true,
  kind: true,
  companyName: true,
  customerId: true,
  documentId: true,
  document: {
    select: {
      id: true,
      documentNumber: true,
      lineItems: {
        select: {
          productName: true,
          productImage: true,
          colorVariantName: true,
          quantity: true,
          product: { select: { imageUrl: true } },
          colorVariant: { select: { imageUrl: true } },
        },
        orderBy: { sequence: "asc" as const },
      },
    },
  },
  location: true,
  mapUrl: true,
  contactName: true,
  contactPhone: true,
  date: true,
  startTime: true,
  endTime: true,
  note: true,
  attendeeId: true,
  createdById: true,
  status: true,
  reviewNote: true,
  attendee: { select: profileNameSelect },
  createdBy: { select: profileNameSelect },
} as const;

const appointmentOrder = [{ date: "asc" as const }, { startTime: "asc" as const }];

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
 * the team can plan around it), China shipment milestones and customer
 * appointments (confirmed + pending + cancelled (struck through on the grid),
 * plus declined ones for the side card — the grid skips those).
 */
export async function getTeamCalendar(
  year: number,
  month: number
): Promise<TeamCalendarData> {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const inMonth = { gte: startOfMonth, lte: endOfMonth };

  const [holidays, leaves, shipments, appointments] = await Promise.all([
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
    prisma.customerAppointment
      .findMany({
        // Cancelled appointments stay on the calendar (drawn struck through);
        // declined ones are for the side card only (the grid skips them).
        where: {
          status: { in: ["PENDING", "CONFIRMED", "CANCELLED", "DECLINED"] },
          date: inMonth,
        },
        select: appointmentSelect,
        orderBy: appointmentOrder,
      })
      .catch(() => []),
  ]);

  return {
    holidays,
    leaves: leaves.map(toLeaveItem),
    shipments: shipments.map(toShipmentItem),
    appointments: appointments.map(toAppointmentItem),
  };
}

/** How long a RECEIVED shipment stays on the dashboard card after it was received. */
const RECEIVED_SHIPMENT_VISIBLE_DAYS = 30;

/**
 * Every shipment on the way plus the ones received into the warehouse during
 * the last `RECEIVED_SHIPMENT_VISIBLE_DAYS` days (receiving goods must not make
 * the lot vanish from the card), newest lot first.
 */
export async function getUpcomingShipments(): Promise<CalendarShipmentItem[]> {
  try {
    const receivedSince = new Date(Date.now() - RECEIVED_SHIPMENT_VISIBLE_DAYS * 86_400_000);
    const rows = await prisma.chinaShipment.findMany({
      where: {
        OR: [
          { status: { in: ["SHIPPED", "ARRIVED_TH"] } },
          {
            status: "RECEIVED",
            OR: [
              { receivedDate: { gte: receivedSince } },
              { receivedDate: null, updatedAt: { gte: receivedSince } },
            ],
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { shippedDate: "desc" }],
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

/** Active admins who can be sent to meet a customer. */
export async function getAdminMembers(): Promise<TeamMemberOption[]> {
  try {
    const rows = await prisma.profile.findMany({
      where: { status: "ACTIVE", role: "ADMIN" },
      select: { id: true, ...profileNameSelect },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((p) => ({ id: p.id, name: profileDisplayName(p) }));
  } catch {
    return [];
  }
}

/**
 * Active users who can take a customer appointment: admins go out to meet
 * customers; for showroom visits any active staff member can receive the
 * customer too (no admin confirmation needed in that case).
 */
export async function getAppointmentAttendees(): Promise<AppointmentAttendeeOption[]> {
  try {
    const rows = await prisma.profile.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, role: true, ...profileNameSelect },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((p) => ({
      id: p.id,
      name: profileDisplayName(p),
      role: p.role === "ADMIN" ? "ADMIN" : "STAFF",
    }));
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
