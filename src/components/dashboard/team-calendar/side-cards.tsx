"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { formatLeaveHours, LEAVE_MAIN_TYPES } from "@/lib/leave-policy";
import type { LeaveBalanceSummary } from "@/data/leave-balances";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Clock,
  FileText,
  Handshake,
  History,
  Navigation,
  PackageCheck,
  Phone,
  Ship,
  Store,
  User,
  UserCheck,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { THAI_MONTHS, formatThaiDate } from "@/lib/thai-date";
import {
  APPOINTMENT_KIND_LABELS,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  CHINA_SHIPMENT_STATUS_COLORS,
  CHINA_SHIPMENT_STATUS_LABELS,
  LEAVE_PERIOD_LABELS,
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
} from "@/lib/constants";
import type {
  CalendarAppointmentItem,
  CalendarLeaveItem,
  CalendarShipmentItem,
} from "@/data/team-calendar";
import {
  AppointmentActionButtons,
  AppointmentCancelButton,
  LeaveActionButtons,
  ShipmentStatusButtons,
} from "./item-actions";
import { ShipmentImageThumbs } from "./shipment-images";

export function daysUntil(iso: string): number {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = Date.parse(`${todayKey}T00:00:00Z`);
  const target = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

function etaText(s: CalendarShipmentItem): { text: string; className: string } {
  if (s.status === "ARRIVED_TH") {
    return { text: "ถึงไทยแล้ว รอรับเข้าคลัง", className: "text-violet-700" };
  }
  if (!s.etaDate) return { text: "ยังไม่ทราบวันถึง", className: "text-muted-foreground" };
  const days = daysUntil(s.etaDate);
  if (days > 0) return { text: `อีก ${days} วันถึง`, className: "text-sky-700" };
  if (days === 0) return { text: "คาดว่าถึงวันนี้", className: "text-amber-700 font-medium" };
  return { text: `เลยกำหนด ${-days} วัน`, className: "text-red-600 font-medium" };
}

/** How many shipment rows are visible before the list scrolls. */
const SHIPMENT_ROWS_VISIBLE = 4;

/**
 * Every shipment still on the way, newest lot on top. Only the first
 * `SHIPMENT_ROWS_VISIBLE` rows are shown; the rest sit below and scroll into
 * view, so the card never pushes the other side cards off the screen.
 */
export function UpcomingShipmentsCard({ shipments }: { shipments: CalendarShipmentItem[] }) {
  const router = useRouter();
  const listRef = useRef<HTMLUListElement>(null);
  const overflow = shipments.length > SHIPMENT_ROWS_VISIBLE;

  // Rows vary in height (photos, buttons), so measure the first N rows instead
  // of guessing a fixed pixel height, and write the result straight to the DOM.
  // Re-measured whenever a visible row changes size (images loading etc.).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (!overflow) {
      list.style.maxHeight = "";
      return;
    }
    const rows = Array.from(list.children).slice(0, SHIPMENT_ROWS_VISIBLE) as HTMLElement[];
    const measure = () => {
      const last = rows[rows.length - 1];
      if (!last) return;
      // Bottom of the Nth row relative to the list top, plus a sliver so the
      // next row peeks out and hints that the list scrolls.
      list.style.maxHeight = `${last.offsetTop - list.offsetTop + last.offsetHeight + 6}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const row of rows) observer.observe(row);
    return () => observer.disconnect();
  }, [overflow, shipments]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Ship className="h-5 w-5" />
          ของจากจีนที่กำลังมา
          {shipments.length > 0 && <Badge variant="secondary">{shipments.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shipments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            ไม่มีของที่อยู่ระหว่างขนส่ง
          </p>
        ) : (
          <div>
            <div className="relative">
              <ul
                ref={listRef}
                className={cn("space-y-3", overflow && "overflow-y-auto overscroll-contain pr-1")}
              >
                {shipments.map((s) => {
                  const eta = etaText(s);
                  return (
                    <li key={s.id} className="space-y-1.5 rounded-md border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground">
                            จีนส่ง {formatThaiDate(new Date(s.shippedDate), "short")}
                            {s.etaDate && ` · ETA ${formatThaiDate(new Date(s.etaDate), "short")}`}
                            {s.containerNo && ` · ล็อต ${s.containerNo}`}
                          </div>
                          <div className={cn("text-xs", eta.className)}>{eta.text}</div>
                        </div>
                        <Badge className={cn("shrink-0", CHINA_SHIPMENT_STATUS_COLORS[s.status])}>
                          {CHINA_SHIPMENT_STATUS_LABELS[s.status]}
                        </Badge>
                      </div>
                      <ShipmentImageThumbs urls={s.imageUrls} size="sm" />
                      <ShipmentStatusButtons shipment={s} onChanged={() => router.refresh()} />
                    </li>
                  );
                })}
              </ul>
              {overflow && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
              )}
            </div>
            {overflow && (
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                เลื่อนลงเพื่อดูอีก {shipments.length - SHIPMENT_ROWS_VISIBLE} รายการ
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingLeavesCard({
  leaves,
  currentUserId,
}: {
  leaves: CalendarLeaveItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserCheck className="h-5 w-5" />
          คำขอลารออนุมัติ
          {leaves.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800">{leaves.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaves.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">ไม่มีคำขอลาค้างอยู่</p>
        ) : (
          <ul className="space-y-3">
            {leaves.map((l) => {
              const start = formatThaiDate(new Date(l.startDate), "short");
              const end = formatThaiDate(new Date(l.endDate), "short");
              return (
                <li key={l.id} className="space-y-1.5 rounded-md border p-2.5">
                  <div className="font-medium">{l.profileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {LEAVE_TYPE_LABELS[l.type]} · {LEAVE_PERIOD_LABELS[l.period]} ·{" "}
                    {start === end ? start : `${start} – ${end}`}
                  </div>
                  {l.reason && <div className="break-words text-sm">{l.reason}</div>}
                  <LeaveActionButtons
                    leave={l}
                    isAdmin
                    currentUserId={currentUserId}
                    onChanged={() => router.refresh()}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function MyLeavesCard({
  leaves,
  currentUserId,
  balance,
}: {
  leaves: CalendarLeaveItem[];
  currentUserId: string;
  balance?: LeaveBalanceSummary | null;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserMinus className="h-5 w-5" />
          การลาของฉัน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {balance && (
          <Link
            href="/profile?tab=leave"
            className="flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-muted/50 px-2.5 py-2 text-xs hover:bg-muted"
          >
            <span className="text-muted-foreground">คงเหลือปีนี้:</span>
            {LEAVE_MAIN_TYPES.map((t) => {
              const remaining = balance.balances[t].remainingHours;
              return (
                <span key={t}>
                  {LEAVE_TYPE_LABELS[t].replace("ลา", "")} {remaining === null ? "-" : formatLeaveHours(remaining)}
                </span>
              );
            })}
            <span className="ml-auto text-primary">ดูทั้งหมด →</span>
          </Link>
        )}
        {leaves.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            ยังไม่มีการลา กด &quot;ขอลา&quot; ในปฏิทินเพื่อส่งคำขอ
          </p>
        ) : (
          <ul className="space-y-3">
            {leaves.map((l) => {
              const start = formatThaiDate(new Date(l.startDate), "short");
              const end = formatThaiDate(new Date(l.endDate), "short");
              return (
                <li key={l.id} className="space-y-1.5 rounded-md border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm">
                      {LEAVE_TYPE_LABELS[l.type]} · {LEAVE_PERIOD_LABELS[l.period]}
                      <div className="text-xs text-muted-foreground">
                        {start === end ? start : `${start} – ${end}`}
                      </div>
                    </div>
                    <Badge className={cn("shrink-0", LEAVE_STATUS_COLORS[l.status])}>
                      {LEAVE_STATUS_LABELS[l.status]}
                    </Badge>
                  </div>
                  {l.reviewNote && (
                    <div className="text-xs text-muted-foreground">หมายเหตุแอดมิน: {l.reviewNote}</div>
                  )}
                  {l.status !== "REJECTED" && (
                    <LeaveActionButtons
                      leave={l}
                      isAdmin={false}
                      currentUserId={currentUserId}
                      onChanged={() => router.refresh()}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function appointmentTimeText(a: CalendarAppointmentItem) {
  return a.endTime ? `${a.startTime}–${a.endTime}` : a.startTime;
}

/** Colours, icon and wording per appointment kind (teal = go out, pink = showroom, yellow = pickup). */
export function appointmentKindStyle(kind: string): {
  border: string;
  text: string;
  Icon: LucideIcon;
  attendeeLabel: string;
  /** Showroom visits and pickups happen at our place: no location line. */
  atShowroom: boolean;
} {
  if (kind === "PICKUP") {
    return {
      border: "border-yellow-200",
      text: "text-yellow-700",
      Icon: PackageCheck,
      attendeeLabel: "ผู้รับนัด",
      atShowroom: true,
    };
  }
  if (kind === "SHOWROOM") {
    return { border: "border-pink-200", text: "text-pink-700", Icon: Store, attendeeLabel: "ผู้รับนัด", atShowroom: true };
  }
  return { border: "border-teal-200", text: "text-teal-700", Icon: Handshake, attendeeLabel: "ผู้ไปพบ", atShowroom: false };
}

/** "ใบเสนอราคา QT-xxx" link plus a short list of what is being collected (PICKUP). */
export function AppointmentQuotationLine({
  appointment: a,
  className,
}: {
  appointment: CalendarAppointmentItem;
  className?: string;
}) {
  if (!a.documentId) return null;
  const items = a.documentItems;
  return (
    <div className={cn("space-y-0.5", className)}>
      <Link
        href={`/quotations/${a.documentId}`}
        className="inline-flex items-center gap-1 font-medium text-yellow-800 underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="h-3.5 w-3.5" />
        ใบเสนอราคา {a.documentNumber ?? "(ไม่มีเลขที่)"}
      </Link>
      {items.length > 0 && (
        <div className="text-muted-foreground">
          สินค้า: {items.slice(0, 3).map((it) => `${it.name} ×${it.quantity}`).join(", ")}
          {items.length > 3 && ` (+${items.length - 3})`}
        </div>
      )}
    </div>
  );
}

function compareSchedule(a: CalendarAppointmentItem, b: CalendarAppointmentItem) {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

/**
 * Nearest upcoming appointment first (today counts as upcoming), then the
 * ones already past, most recently passed first, so what is coming up always
 * sits at the top of the list.
 */
export function splitUpcomingPast(items: CalendarAppointmentItem[]) {
  const upcoming = items.filter((a) => daysUntil(a.date) >= 0).sort(compareSchedule);
  const past = items.filter((a) => daysUntil(a.date) < 0).sort((a, b) => compareSchedule(b, a));
  return { upcoming, past };
}

/** Tappable "เปิดแผนที่" (Google Maps app on phones) and "โทร" (tel:) links plus the contact name. */
export function AppointmentContactLinks({
  appointment: a,
  className,
}: {
  appointment: CalendarAppointmentItem;
  className?: string;
}) {
  if (!a.mapUrl && !a.contactName && !a.contactPhone) return null;
  const phoneHref = a.contactPhone ? `tel:${a.contactPhone.replace(/[^+\d]/g, "")}` : null;
  return (
    <div className={cn("mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", className)}>
      {a.mapUrl && (
        <a
          href={a.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-teal-700 underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Navigation className="h-3.5 w-3.5" />
          เปิดแผนที่
        </a>
      )}
      {a.contactName && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          {a.contactName}
        </span>
      )}
      {phoneHref && (
        <a
          href={phoneHref}
          className="inline-flex items-center gap-1 font-medium text-teal-700 underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3.5 w-3.5" />
          {a.contactPhone}
        </a>
      )}
    </div>
  );
}

function appointmentWhen(a: CalendarAppointmentItem): { text: string; className: string } {
  const days = daysUntil(a.date);
  if (days === 0) return { text: "วันนี้", className: "text-amber-700 font-medium" };
  if (days === 1) return { text: "พรุ่งนี้", className: "text-sky-700" };
  if (days > 1) return { text: `อีก ${days} วัน`, className: "text-sky-700" };
  return { text: `ผ่านมาแล้ว ${-days} วัน`, className: "text-muted-foreground" };
}

function AppointmentRow({
  appointment: a,
  isAdmin,
  currentUserId,
  showStatus,
  showCountdown = false,
}: {
  appointment: CalendarAppointmentItem;
  isAdmin: boolean;
  currentUserId: string;
  showStatus: boolean;
  /** Show "วันนี้ / อีก N วัน" like the shipments card. */
  showCountdown?: boolean;
}) {
  const router = useRouter();
  const forMe = a.attendeeId === currentUserId;
  const style = appointmentKindStyle(a.kind);
  const cancelled = a.status === "CANCELLED";
  const when = showCountdown && !cancelled ? appointmentWhen(a) : null;
  return (
    <li
      className={cn(
        "space-y-1.5 rounded-md border p-2.5",
        cancelled ? "border-gray-200 bg-gray-50/60" : style.border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("min-w-0", cancelled && "text-muted-foreground line-through decoration-gray-400")}>
          <div className={cn("flex items-center gap-1 text-[11px]", style.text)}>
            <style.Icon className="h-3 w-3" />
            {APPOINTMENT_KIND_LABELS[a.kind] ?? "นัดพบลูกค้า"}
          </div>
          <div className="truncate font-medium">{a.companyName}</div>
          <div className="text-xs text-muted-foreground">
            {formatThaiDate(new Date(a.date), "short")} · {appointmentTimeText(a)} น.
            {when && (
              <>
                {" · "}
                <span className={when.className}>{when.text}</span>
              </>
            )}
          </div>
          {!style.atShowroom && a.location && (
            <div className="truncate text-xs text-muted-foreground">{a.location}</div>
          )}
          <AppointmentQuotationLine appointment={a} className="mt-1 text-xs" />
          <AppointmentContactLinks appointment={a} className="text-xs" />
          <div className="text-xs">
            {style.attendeeLabel}:{" "}
            <span className={cn(forMe && "font-medium text-teal-700")}>{a.attendeeName}</span>
            {forMe && " (คุณ)"}
            {a.createdById !== a.attendeeId && (
              <span className="text-muted-foreground"> · ลงโดย {a.createdByName}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {showStatus && !cancelled && (
            <Badge className={cn("shrink-0", APPOINTMENT_STATUS_COLORS[a.status])}>
              {APPOINTMENT_STATUS_LABELS[a.status]}
            </Badge>
          )}
          <AppointmentCancelButton
            appointment={a}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            onChanged={() => router.refresh()}
          />
        </div>
      </div>
      {a.note && <div className={cn("text-sm", cancelled && "text-muted-foreground line-through")}>{a.note}</div>}
      {a.reviewNote && (
        <div className="text-xs text-muted-foreground">หมายเหตุแอดมิน: {a.reviewNote}</div>
      )}
      <AppointmentActionButtons appointment={a} isAdmin={isAdmin} onChanged={() => router.refresh()} />
    </li>
  );
}

/** Confirmed appointments: upcoming first, then a "ผ่านมาแล้ว" divider and the past ones. */
function ConfirmedAppointmentList({
  appointments,
  isAdmin,
  currentUserId,
}: {
  appointments: CalendarAppointmentItem[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const { upcoming, past } = useMemo(() => splitUpcomingPast(appointments), [appointments]);
  const row = (a: CalendarAppointmentItem) => (
    <AppointmentRow
      key={a.id}
      appointment={a}
      isAdmin={isAdmin}
      currentUserId={currentUserId}
      showStatus={false}
      showCountdown
    />
  );
  return (
    <ul className="space-y-3">
      {upcoming.map(row)}
      {past.length > 0 && (
        <li className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <History className="h-3 w-3" />
          ผ่านมาแล้ว
          <span className="h-px flex-1 bg-border" />
        </li>
      )}
      {past.map(row)}
    </ul>
  );
}

/**
 * One card for customer appointments (visits and showroom viewings; pickups
 * have their own card below), scoped to the month shown on the calendar grid
 * (it follows the ‹ › navigation): first the ones waiting for a "ว่าง"
 * confirmation (ADMIN: everyone's PENDING; STAFF: their own pending /
 * declined ones with the admin's answer), then the confirmed appointments of
 * that month, nearest upcoming first and the past ones at the bottom.
 */
export function AppointmentsCard({
  appointments,
  year,
  month,
  isPending = false,
  isAdmin,
  currentUserId,
}: {
  /** Every appointment of the month (PENDING, CONFIRMED, DECLINED and CANCELLED; cancelled ones are not listed here). */
  appointments: CalendarAppointmentItem[];
  year: number;
  month: number;
  /** True while another month is being fetched. */
  isPending?: boolean;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const { pending, confirmed } = useMemo(() => {
    const own = appointments.filter((a) => a.kind !== "PICKUP");
    const pending = own.filter((a) =>
      isAdmin
        ? a.status === "PENDING"
        : (a.status === "PENDING" || a.status === "DECLINED") &&
          (a.createdById === currentUserId || a.attendeeId === currentUserId)
    );
    const confirmed = own.filter((a) => a.status === "CONFIRMED");
    return { pending, confirmed };
  }, [appointments, isAdmin, currentUserId]);
  const pendingCount = pending.filter((a) => a.status === "PENDING").length;
  const monthLabel = `${THAI_MONTHS[month - 1]} ${year + 543}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Handshake className="h-5 w-5" />
          นัดพบลูกค้า
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800">รอยืนยัน {pendingCount}</Badge>
          )}
          {confirmed.length > 0 && <Badge variant="secondary">{confirmed.length}</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{monthLabel}</p>
      </CardHeader>
      <CardContent className={cn("space-y-4 transition-opacity", isPending && "opacity-50")}>
        {pending.length === 0 && confirmed.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {isAdmin
              ? `ไม่มีนัดลูกค้าใน${monthLabel} กด "นัดลูกค้า" ในปฏิทินเพื่อเพิ่ม`
              : `ไม่มีนัดใน${monthLabel} กด "นัดลูกค้า" ในปฏิทินเพื่อลงนัดให้แอดมิน`}
          </p>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <Clock className="h-3.5 w-3.5" />
                  {isAdmin ? "รอยืนยันว่าว่าง" : "นัดที่ฉันลงไว้ (รอแอดมิน)"}
                </div>
                <ul className="space-y-3">
                  {pending.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appointment={a}
                      isAdmin={isAdmin}
                      currentUserId={currentUserId}
                      showStatus={!isAdmin}
                    />
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5" />
                นัดที่ยืนยันแล้ว
              </div>
              {confirmed.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  ยังไม่มีนัดที่ยืนยันแล้วในเดือนนี้
                </p>
              ) : (
                <ConfirmedAppointmentList
                  appointments={confirmed}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * "รับสินค้าที่โชว์รูม" (yellow): the PICKUP appointments of the month shown on
 * the grid, kept apart from the visits card. Same pending rule as above, then
 * the confirmed pickups, nearest first and the past ones at the bottom. Each
 * row links to the confirmed quotation being collected.
 */
export function PickupCard({
  appointments,
  year,
  month,
  isPending = false,
  isAdmin,
  currentUserId,
}: {
  appointments: CalendarAppointmentItem[];
  year: number;
  month: number;
  isPending?: boolean;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const { pending, confirmed } = useMemo(() => {
    const pickups = appointments.filter((a) => a.kind === "PICKUP");
    const pending = pickups.filter((a) =>
      isAdmin
        ? a.status === "PENDING"
        : (a.status === "PENDING" || a.status === "DECLINED") &&
          (a.createdById === currentUserId || a.attendeeId === currentUserId)
    );
    const confirmed = pickups.filter((a) => a.status === "CONFIRMED");
    return { pending, confirmed };
  }, [appointments, isAdmin, currentUserId]);
  const pendingCount = pending.filter((a) => a.status === "PENDING").length;
  const monthLabel = `${THAI_MONTHS[month - 1]} ${year + 543}`;
  return (
    <Card className="border-yellow-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <PackageCheck className="h-5 w-5 text-yellow-700" />
          รับสินค้าที่โชว์รูม
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800">รอยืนยัน {pendingCount}</Badge>
          )}
          {confirmed.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800">{confirmed.length}</Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{monthLabel}</p>
      </CardHeader>
      <CardContent className={cn("space-y-4 transition-opacity", isPending && "opacity-50")}>
        {pending.length === 0 && confirmed.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            ไม่มีนัดรับสินค้าใน{monthLabel} กด &quot;นัดลูกค้า&quot; ในปฏิทินแล้วเลือก &quot;รับสินค้าที่โชว์รูม&quot;
          </p>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <Clock className="h-3.5 w-3.5" />
                  {isAdmin ? "รอยืนยันว่าว่าง" : "นัดที่ฉันลงไว้ (รอแอดมิน)"}
                </div>
                <ul className="space-y-3">
                  {pending.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appointment={a}
                      isAdmin={isAdmin}
                      currentUserId={currentUserId}
                      showStatus={!isAdmin}
                    />
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5" />
                นัดรับสินค้าที่ยืนยันแล้ว
              </div>
              {confirmed.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  ยังไม่มีนัดรับสินค้าที่ยืนยันแล้วในเดือนนี้
                </p>
              ) : (
                <ConfirmedAppointmentList
                  appointments={confirmed}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
