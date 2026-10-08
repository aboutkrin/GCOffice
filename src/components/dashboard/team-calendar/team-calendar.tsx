"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Ship,
  UserMinus,
  CalendarOff,
  Pencil,
  Trash2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { THAI_MONTHS, THAI_DAY_LABELS, formatThaiDate } from "@/lib/thai-date";
import {
  CHINA_SHIPMENT_STATUS_COLORS,
  CHINA_SHIPMENT_STATUS_LABELS,
  LEAVE_PERIOD_LABELS,
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
} from "@/lib/constants";
import { fetchTeamCalendarAction } from "@/actions/dashboard-actions";
import { deleteChinaShipment } from "@/actions/china-shipment-actions";
import type { HolidayItem } from "@/data/dashboard";
import type {
  CalendarLeaveItem,
  CalendarShipmentItem,
  TeamCalendarData,
  TeamMemberOption,
} from "@/data/team-calendar";

import { LeaveRequestDialog } from "./leave-request-dialog";
import { ChinaShipmentDialog } from "./china-shipment-dialog";
import { LeaveActionButtons, ShipmentStatusButtons } from "./item-actions";

type ShipmentMilestone = "shipped" | "eta" | "arrived" | "received";

type DayEvent =
  | { kind: "holiday"; item: HolidayItem }
  | { kind: "leave"; item: CalendarLeaveItem }
  | { kind: "shipment"; milestone: ShipmentMilestone; item: CalendarShipmentItem };

type Filter = "holiday" | "leave" | "shipment";

const MILESTONE_LABELS: Record<ShipmentMilestone, string> = {
  shipped: "จีนส่งของ",
  eta: "คาดว่าถึงไทย",
  arrived: "ถึงไทย",
  received: "รับเข้าคลัง",
};

const MAX_CHIPS = 3;

const dateKey = (iso: string) => iso.slice(0, 10);

function keyFor(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function thaiTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Group every calendar item of the month by its YYYY-MM-DD day key. */
function buildEventMap(data: TeamCalendarData, year: number, month: number) {
  const map = new Map<string, DayEvent[]>();
  const push = (key: string, ev: DayEvent) => {
    const list = map.get(key);
    if (list) list.push(ev);
    else map.set(key, [ev]);
  };

  for (const h of data.holidays) push(dateKey(h.date), { kind: "holiday", item: h });

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (const l of data.leaves) {
    const start = dateKey(l.startDate);
    const end = dateKey(l.endDate);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = keyFor(year, month, d);
      if (key >= start && key <= end) push(key, { kind: "leave", item: l });
    }
  }

  for (const s of data.shipments) {
    push(dateKey(s.shippedDate), { kind: "shipment", milestone: "shipped", item: s });
    if (s.etaDate && s.status === "SHIPPED") {
      push(dateKey(s.etaDate), { kind: "shipment", milestone: "eta", item: s });
    }
    if (s.arrivedDate) {
      push(dateKey(s.arrivedDate), { kind: "shipment", milestone: "arrived", item: s });
    }
    if (s.receivedDate) {
      push(dateKey(s.receivedDate), { kind: "shipment", milestone: "received", item: s });
    }
  }
  return map;
}

function chipLabel(ev: DayEvent): string {
  if (ev.kind === "holiday") return ev.item.name;
  if (ev.kind === "leave") {
    const period = ev.item.period !== "FULL_DAY" ? ` ${LEAVE_PERIOD_LABELS[ev.item.period]}` : "";
    return `${ev.item.profileName} (${LEAVE_TYPE_LABELS[ev.item.type]}${period})`;
  }
  return `${MILESTONE_LABELS[ev.milestone]}: ${ev.item.title}`;
}

function chipClass(ev: DayEvent): string {
  if (ev.kind === "holiday") return "bg-red-100 text-red-800 border-red-200";
  if (ev.kind === "leave") {
    return ev.item.status === "PENDING"
      ? "bg-amber-50 text-amber-800 border-amber-300 border-dashed"
      : "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (ev.milestone === "eta") return "bg-sky-50 text-sky-800 border-sky-300 border-dashed";
  if (ev.milestone === "received") return "bg-green-100 text-green-800 border-green-200";
  return "bg-sky-100 text-sky-800 border-sky-200";
}

function EventChip({ ev }: { ev: DayEvent }) {
  return (
    <div
      className={cn(
        "truncate rounded border px-1 py-0.5 text-[11px] leading-tight",
        chipClass(ev)
      )}
      title={chipLabel(ev)}
    >
      {chipLabel(ev)}
    </div>
  );
}

function formatRange(startIso: string, endIso: string) {
  const start = formatThaiDate(new Date(startIso), "short");
  if (dateKey(startIso) === dateKey(endIso)) return start;
  return `${start} – ${formatThaiDate(new Date(endIso), "short")}`;
}

interface TeamCalendarProps {
  initialData: TeamCalendarData;
  initialYear: number;
  initialMonth: number;
  isAdmin: boolean;
  currentUserId: string;
  members: TeamMemberOption[];
}

export function TeamCalendar({
  initialData,
  initialYear,
  initialMonth,
  isAdmin,
  currentUserId,
  members,
}: TeamCalendarProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<Record<Filter, boolean>>({
    holiday: true,
    leave: true,
    shipment: true,
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [leaveDialog, setLeaveDialog] = useState<{
    open: boolean;
    leave?: CalendarLeaveItem | null;
    date?: Date;
  }>({ open: false });
  const [shipmentDialog, setShipmentDialog] = useState<{
    open: boolean;
    shipment?: CalendarShipmentItem | null;
    date?: Date;
  }>({ open: false });

  // Keep the displayed month in sync after router.refresh() (any mutation on
  // the dashboard re-renders the server page and hands us new initialData).
  const viewRef = useRef({ year, month });
  viewRef.current = { year, month };
  useEffect(() => {
    const { year: y, month: m } = viewRef.current;
    if (y === initialYear && m === initialMonth) {
      setData(initialData);
    } else {
      startTransition(async () => setData(await fetchTeamCalendarAction(y, m)));
    }
  }, [initialData, initialYear, initialMonth]);

  function load(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      setData(await fetchTeamCalendarAction(newYear, newMonth));
    });
  }

  function navigate(direction: -1 | 1) {
    let m = month + direction;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    load(y, m);
  }

  function goToday() {
    const [y, m] = thaiTodayKey().split("-").map(Number);
    load(y, m);
  }

  const onChanged = () => router.refresh();

  const eventMap = useMemo(() => buildEventMap(data, year, month), [data, year, month]);
  const visible = (ev: DayEvent) => filters[ev.kind];

  const todayKey = thaiTodayKey();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const agendaDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .map((d) => ({
      day: d,
      key: keyFor(year, month, d),
      events: (eventMap.get(keyFor(year, month, d)) ?? []).filter(visible),
    }))
    .filter((d) => d.events.length > 0);

  const selectedEvents = selectedDay ? eventMap.get(selectedDay) ?? [] : [];
  const selectedDate = selectedDay ? new Date(`${selectedDay}T12:00:00Z`) : undefined;

  function openLeave(date?: Date, leave?: CalendarLeaveItem) {
    setSelectedDay(null);
    setLeaveDialog({
      open: true,
      leave: leave ?? null,
      date: date ?? new Date(`${todayKey}T12:00:00Z`),
    });
  }

  function openShipment(date?: Date, shipment?: CalendarShipmentItem) {
    setSelectedDay(null);
    setShipmentDialog({
      open: true,
      shipment: shipment ?? null,
      date: date ?? new Date(`${todayKey}T12:00:00Z`),
    });
  }

  async function handleDeleteShipment(id: string) {
    if (!confirm("ยืนยันลบรายการของจากจีนนี้?")) return;
    try {
      await deleteChinaShipment(id);
      toast.success("ลบรายการแล้ว");
      setSelectedDay(null);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  }

  const filterButtons: { key: Filter; label: string; dot: string }[] = [
    { key: "holiday", label: "วันหยุดบริษัท", dot: "bg-red-400" },
    { key: "leave", label: "วันลา", dot: "bg-blue-400" },
    { key: "shipment", label: "ของจากจีน", dot: "bg-sky-400" },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="h-5 w-5" />
            ปฏิทินทีม
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openLeave()}>
              <UserMinus className="mr-1 h-4 w-4" />
              {isAdmin ? "เพิ่มวันลา" : "ขอลา"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => openShipment()}>
              <Ship className="mr-1 h-4 w-4" />
              เพิ่มของจากจีน
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/holidays/new">
                  <CalendarOff className="mr-1 h-4 w-4" />
                  เพิ่มวันหยุดบริษัท
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className={cn("transition-opacity", isPending && "opacity-50")}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate(-1)}
                disabled={isPending}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="min-w-36 text-center text-lg font-semibold">
                {THAI_MONTHS[month - 1]} {year + 543}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate(1)}
                disabled={isPending}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToday} disabled={isPending}>
                วันนี้
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {filterButtons.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity",
                    !filters[f.key] && "opacity-40"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", f.dot)} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop month grid */}
          <div className="hidden overflow-hidden rounded-md border md:block">
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {THAI_DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "py-1.5 text-center text-xs font-medium",
                    (i === 0 || i === 6) && "text-red-500"
                  )}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="min-h-24 border-b border-r bg-muted/20" />;
                }
                const key = keyFor(year, month, day);
                const events = (eventMap.get(key) ?? []).filter(visible);
                const isHoliday = events.some((e) => e.kind === "holiday");
                const dow = idx % 7;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={cn(
                      "flex min-h-24 flex-col gap-0.5 border-b border-r p-1 text-left align-top hover:bg-accent/50",
                      (dow === 0 || dow === 6 || isHoliday) && "bg-red-50/40",
                      key === todayKey && "bg-blue-50"
                    )}
                  >
                    <span
                      className={cn(
                        "mb-0.5 text-xs font-medium",
                        key === todayKey &&
                          "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      )}
                    >
                      {day}
                    </span>
                    {events.slice(0, MAX_CHIPS).map((ev, i) => (
                      <EventChip key={i} ev={ev} />
                    ))}
                    {events.length > MAX_CHIPS && (
                      <span className="text-[11px] text-muted-foreground">
                        +{events.length - MAX_CHIPS} รายการ
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile agenda */}
          <div className="space-y-2 md:hidden">
            {agendaDays.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                ไม่มีวันหยุด วันลา หรือของจากจีนในเดือนนี้
              </p>
            ) : (
              agendaDays.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDay(d.key)}
                  className={cn(
                    "flex w-full gap-3 rounded-md border p-2 text-left",
                    d.key === todayKey && "border-primary"
                  )}
                >
                  <div className="w-12 shrink-0 text-center">
                    <div className="text-lg font-semibold leading-none">{d.day}</div>
                    <div className="text-xs text-muted-foreground">
                      {THAI_DAY_LABELS[new Date(`${d.key}T12:00:00Z`).getUTCDay()]}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    {d.events.map((ev, i) => (
                      <EventChip key={i} ev={ev} />
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            กรอบเส้นประ = วันลารออนุมัติ / วันที่คาดว่าของจะถึง · กดที่วันเพื่อดูรายละเอียดหรือเพิ่มรายการ
          </p>
        </CardContent>
      </Card>

      {/* Day detail */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDate && formatThaiDate(selectedDate, "long")}</DialogTitle>
            <DialogDescription>
              {selectedEvents.length === 0 ? "ยังไม่มีรายการในวันนี้" : `${selectedEvents.length} รายการ`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedEvents.map((ev, i) => {
              if (ev.kind === "holiday") {
                return (
                  <div key={i} className="rounded-md border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                      <CalendarOff className="h-4 w-4" />
                      วันหยุดบริษัท: {ev.item.name}
                    </div>
                  </div>
                );
              }
              if (ev.kind === "leave") {
                const l = ev.item;
                const canEdit = isAdmin || (l.profileId === currentUserId && l.status === "PENDING");
                return (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{l.profileName}</div>
                        <div className="text-sm text-muted-foreground">
                          {LEAVE_TYPE_LABELS[l.type]} · {LEAVE_PERIOD_LABELS[l.period]} ·{" "}
                          {formatRange(l.startDate, l.endDate)}
                        </div>
                        {l.reason && <div className="mt-1 text-sm">{l.reason}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={cn("shrink-0", LEAVE_STATUS_COLORS[l.status])}>
                          {LEAVE_STATUS_LABELS[l.status]}
                        </Badge>
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openLeave(undefined, l)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <LeaveActionButtons
                      leave={l}
                      isAdmin={isAdmin}
                      currentUserId={currentUserId}
                      onChanged={() => {
                        setSelectedDay(null);
                        onChanged();
                      }}
                    />
                  </div>
                );
              }
              const s = ev.item;
              return (
                <div key={i} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">{MILESTONE_LABELS[ev.milestone]}</div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-sm text-muted-foreground">
                        จีนส่ง {formatThaiDate(new Date(s.shippedDate), "short")}
                        {s.etaDate && ` · คาดว่าถึง ${formatThaiDate(new Date(s.etaDate), "short")}`}
                        {s.arrivedDate && ` · ถึงไทย ${formatThaiDate(new Date(s.arrivedDate), "short")}`}
                        {s.receivedDate && ` · รับเข้าคลัง ${formatThaiDate(new Date(s.receivedDate), "short")}`}
                      </div>
                      {(s.containerNo || s.supplier) && (
                        <div className="text-sm text-muted-foreground">
                          {[s.containerNo && `ตู้/Tracking: ${s.containerNo}`, s.supplier]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                      {s.note && <div className="mt-1 text-sm">{s.note}</div>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={cn("shrink-0", CHINA_SHIPMENT_STATUS_COLORS[s.status])}>
                        {CHINA_SHIPMENT_STATUS_LABELS[s.status]}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openShipment(undefined, s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600"
                          onClick={() => handleDeleteShipment(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <ShipmentStatusButtons
                    shipment={s}
                    onChanged={() => {
                      setSelectedDay(null);
                      onChanged();
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={() => openLeave(selectedDate)}>
              <Plus className="mr-1 h-4 w-4" />
              {isAdmin ? "เพิ่มวันลาวันนี้" : "ขอลาวันนี้"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => openShipment(selectedDate)}>
              <Plus className="mr-1 h-4 w-4" />
              จีนส่งของวันนี้
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LeaveRequestDialog
        open={leaveDialog.open}
        onOpenChange={(open) => setLeaveDialog((prev) => ({ ...prev, open }))}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        members={members}
        leave={leaveDialog.leave}
        defaultDate={leaveDialog.date}
        onSaved={onChanged}
      />
      <ChinaShipmentDialog
        open={shipmentDialog.open}
        onOpenChange={(open) => setShipmentDialog((prev) => ({ ...prev, open }))}
        shipment={shipmentDialog.shipment}
        defaultDate={shipmentDialog.date}
        onSaved={onChanged}
      />
    </>
  );
}
