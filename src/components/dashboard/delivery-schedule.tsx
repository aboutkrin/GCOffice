"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Package, FileText, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBaht } from "@/lib/thai-currency";
import {
  fetchDeliveryScheduleAction,
  fetchHolidaysForMonthAction,
  markDocumentShippedAction,
} from "@/actions/dashboard-actions";
import type { DeliveryScheduleItem, HolidayItem } from "@/data/dashboard";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const DAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

interface DeliveryScheduleProps {
  initialData: DeliveryScheduleItem[];
  initialYear: number;
  initialMonth: number;
  initialHolidays: HolidayItem[];
}

// Color palette for delivery bars
const BAR_COLORS = [
  "bg-blue-200 text-blue-900 border-blue-300",
  "bg-green-200 text-green-900 border-green-300",
  "bg-amber-200 text-amber-900 border-amber-300",
  "bg-purple-200 text-purple-900 border-purple-300",
  "bg-pink-200 text-pink-900 border-pink-300",
  "bg-teal-200 text-teal-900 border-teal-300",
  "bg-orange-200 text-orange-900 border-orange-300",
  "bg-indigo-200 text-indigo-900 border-indigo-300",
];

const SHIPPED_BAR_COLOR = "bg-gray-200 text-gray-500 border-gray-300";

function getBarColor(index: number, status: string) {
  if (status === "SHIPPED") return SHIPPED_BAR_COLOR;
  return BAR_COLORS[index % BAR_COLORS.length];
}

const COL_WIDTH = 44; // px per day column

// --- Timeline helpers ---

interface TimelineDay {
  date: number;
  dow: number; // 0=Sun … 6=Sat
  isToday: boolean;
  isWeekend: boolean;
  dateObj: Date;
  holiday?: HolidayItem;
}

function buildTimelineDays(
  year: number,
  month: number,
  holidays: HolidayItem[]
): TimelineDay[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const days: TimelineDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(Date.UTC(year, month - 1, d));
    const dow = dateObj.getUTCDay();
    const dateStr = dateObj.toISOString().slice(0, 10);
    days.push({
      date: d,
      dow,
      isToday: dateObj.getTime() === todayUTC,
      isWeekend: dow === 0 || dow === 6,
      dateObj,
      holiday: holidays.find((h) => h.date.slice(0, 10) === dateStr),
    });
  }
  return days;
}

interface GanttRow {
  item: DeliveryScheduleItem;
  colorClass: string;
  startDay: number; // 1-based, clamped
  endDay: number; // 1-based, clamped
  isClippedStart: boolean;
  isClippedEnd: boolean;
}

function computeGanttRows(
  items: DeliveryScheduleItem[],
  daysInMonth: number,
  year: number,
  month: number
): GanttRow[] {
  const monthStart = Date.UTC(year, month - 1, 1);
  const monthEnd = Date.UTC(year, month - 1, daysInMonth);

  // Sort by start date
  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.deliveryDateStart).getTime() -
      new Date(b.deliveryDateStart).getTime()
  );

  return sorted.map((item, idx) => {
    const itemStart = new Date(item.deliveryDateStart).getTime();
    const itemEnd = item.deliveryDateEnd
      ? new Date(item.deliveryDateEnd).getTime()
      : itemStart;

    const clampedStart = Math.max(itemStart, monthStart);
    const clampedEnd = Math.min(itemEnd, monthEnd);

    const startDay = new Date(clampedStart).getUTCDate();
    const endDay = new Date(clampedEnd).getUTCDate();

    return {
      item,
      colorClass: getBarColor(idx, item.status),
      startDay,
      endDay,
      isClippedStart: itemStart < monthStart,
      isClippedEnd: itemEnd > monthEnd,
    };
  });
}

export function DeliverySchedule({
  initialData,
  initialYear,
  initialMonth,
  initialHolidays,
}: DeliveryScheduleProps) {
  const [data, setData] = useState(initialData);
  const [holidays, setHolidays] = useState(initialHolidays);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [isPending, startTransition] = useTransition();
  const [isShipping, setIsShipping] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeliveryScheduleItem | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const timelineDays = useMemo(
    () => buildTimelineDays(year, month, holidays),
    [year, month, holidays]
  );

  const ganttRows = useMemo(
    () => computeGanttRows(data, timelineDays.length, year, month),
    [data, timelineDays.length, year, month]
  );

  const todayIndex = useMemo(
    () => timelineDays.findIndex((d) => d.isToday),
    [timelineDays]
  );

  // Auto-scroll to today column on mount and when navigating to a month with today
  useEffect(() => {
    if (todayIndex >= 0 && scrollRef.current) {
      const scrollLeft = todayIndex * COL_WIDTH - scrollRef.current.clientWidth / 2 + COL_WIDTH / 2;
      scrollRef.current.scrollLeft = Math.max(0, scrollLeft);
    }
  }, [todayIndex]);

  function navigate(direction: -1 | 1) {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      const [result, holidayResult] = await Promise.all([
        fetchDeliveryScheduleAction(newYear, newMonth),
        fetchHolidaysForMonthAction(newYear, newMonth),
      ]);
      setData(result);
      setHolidays(holidayResult);
    });
  }

  function goToday() {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    setYear(todayYear);
    setMonth(todayMonth);
    startTransition(async () => {
      const [result, holidayResult] = await Promise.all([
        fetchDeliveryScheduleAction(todayYear, todayMonth),
        fetchHolidaysForMonthAction(todayYear, todayMonth),
      ]);
      setData(result);
      setHolidays(holidayResult);
    });
  }

  async function handleMarkShipped(id: string) {
    setIsShipping(true);
    try {
      await markDocumentShippedAction(id);
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "SHIPPED" } : item
        )
      );
      setSelectedItem((prev) =>
        prev && prev.id === id ? { ...prev, status: "SHIPPED" } : prev
      );
    } catch (error) {
      console.error("Failed to mark as shipped:", error);
    } finally {
      setIsShipping(false);
    }
  }

  const gridCols = timelineDays.length;
  const gridWidth = gridCols * COL_WIDTH;
  const todayLeftPercent = todayIndex >= 0 ? (todayIndex / gridCols) * 100 : 0;
  const colWidthPercent = (1 / gridCols) * 100;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            กำหนดส่งสินค้า
          </CardTitle>
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
            <Button
              variant="ghost"
              size="sm"
              className="text-sm font-medium px-2"
              onClick={goToday}
              disabled={isPending}
            >
              วันนี้
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(1)}
              disabled={isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={cn("transition-opacity", isPending && "opacity-50")}>
          {/* Month/Year header */}
          <div className="text-center mb-3">
            <h3 className="text-lg font-semibold">
              {THAI_MONTHS[month - 1]} {year + 543}
            </h3>
          </div>

          {/* Gantt timeline */}
          <div
            ref={scrollRef}
            className="overflow-x-auto border rounded-md"
          >
            <div style={{ minWidth: `${gridWidth}px` }} className="relative">
              {/* Today column highlight */}
              {todayIndex >= 0 && (
                <div
                  className="absolute top-0 bottom-0 bg-blue-50/70 pointer-events-none z-[1]"
                  style={{
                    left: `${todayLeftPercent}%`,
                    width: `${colWidthPercent}%`,
                  }}
                />
              )}

              {/* Day header row */}
              <div
                className="grid border-b sticky top-0 bg-background z-20"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(${COL_WIDTH}px, 1fr))`,
                }}
              >
                {timelineDays.map((day) => (
                  <div
                    key={day.date}
                    className={cn(
                      "text-center py-1 border-r border-gray-200 last:border-r-0",
                      day.isWeekend && "bg-gray-50",
                      day.holiday && "bg-red-50"
                    )}
                    title={day.holiday?.name}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                        day.isToday && "bg-red-500 text-white font-bold",
                        !day.isToday && day.dow === 0 && "text-red-500"
                      )}
                    >
                      {day.date}
                    </div>
                    <div
                      className={cn(
                        "text-[10px] leading-tight text-muted-foreground",
                        day.dow === 0 && "text-red-500"
                      )}
                    >
                      {DAY_LABELS[day.dow]}
                    </div>
                    {day.holiday && (
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-red-400 mx-auto mt-0.5"
                        title={day.holiday.name}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Delivery rows */}
              {ganttRows.map((row) => (
                <div
                  key={row.item.id}
                  className="grid relative z-10 border-b border-gray-100"
                  style={{
                    gridTemplateColumns: `repeat(${gridCols}, minmax(${COL_WIDTH}px, 1fr))`,
                  }}
                >
                  <button
                    onClick={() => setSelectedItem(row.item)}
                    className={cn(
                      "flex items-center h-5 my-px px-1 text-[10px] leading-tight border cursor-pointer transition-colors hover:opacity-80",
                      row.colorClass,
                      !row.isClippedStart && "rounded-l-md ml-0.5",
                      !row.isClippedEnd && "rounded-r-md mr-0.5"
                    )}
                    style={{
                      gridColumn: `${row.startDay} / ${row.endDay + 1}`,
                    }}
                    title={row.item.customerName}
                  >
                    {row.item.status === "SHIPPED" && (
                      <Truck className="h-3 w-3 shrink-0 mr-0.5 opacity-70" />
                    )}
                    <span
                      className={cn(
                        "truncate flex-1 text-left font-medium",
                        row.item.status === "SHIPPED" && "line-through"
                      )}
                    >
                      {row.item.customerName}
                    </span>
                    <span className="shrink-0 ml-1 text-[9px] opacity-60">
                      {row.item.lineItems.length}
                    </span>
                  </button>
                </div>
              ))}

              {/* Empty state */}
              {data.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  ไม่มีกำหนดส่งสินค้าในเดือนนี้
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {data.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              รวม {data.length} รายการส่งสินค้าในเดือนนี้
            </div>
          )}
          {data.length > 0 && (
            <div className="flex items-center gap-4 mt-3 pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-3 rounded bg-blue-200 border border-blue-300" />
                <span>ยืนยันแล้ว</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-3 rounded bg-gray-200 border border-gray-300" />
                <Truck className="h-3 w-3 text-gray-500" />
                <span>ส่งแล้ว</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] bg-muted px-1 rounded">2</span>
                <span>= จำนวนรายการ</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedItem?.customerName}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.documentNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {/* Delivery info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">กำหนดส่ง: </span>
                  <span className="font-medium">
                    {formatDeliveryRange(
                      selectedItem.deliveryDateStart,
                      selectedItem.deliveryDateEnd
                    )}
                  </span>
                </div>
                {selectedItem.productionDays && (
                  <div>
                    <span className="text-muted-foreground">ระยะผลิต: </span>
                    <span className="font-medium">
                      {selectedItem.productionDays}
                    </span>
                  </div>
                )}
              </div>

              {/* Line items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">รายการสินค้า</h4>
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {selectedItem.lineItems.map((li, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm border-b pb-2 last:border-0"
                    >
                      {li.productImage ? (
                        <Image
                          src={li.productImage}
                          alt={li.productName}
                          width={48}
                          height={48}
                          className="rounded object-cover shrink-0"
                          style={{ width: 48, height: 48 }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 min-w-0 pt-1">{li.productName}</span>
                      <Badge variant="secondary" className="shrink-0 mt-1">
                        {li.quantity.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">ยอดรวม</span>
                <span className="text-lg font-bold">
                  {formatBaht(selectedItem.grandTotal)}
                </span>
              </div>

              {/* Shipped button */}
              {selectedItem.status === "CONFIRMED" && (
                <Button
                  onClick={() => handleMarkShipped(selectedItem.id)}
                  disabled={isShipping}
                  className="w-full"
                  variant="outline"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  {isShipping ? "กำลังบันทึก..." : "ส่งสินค้าแล้ว"}
                </Button>
              )}

              {selectedItem.status === "SHIPPED" && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                  <Truck className="h-4 w-4" />
                  ส่งสินค้าแล้ว
                </div>
              )}

              {/* Link to quotation */}
              <Link
                href={`/quotations/${selectedItem.id}/preview`}
                className="block text-center text-sm text-primary hover:underline"
              >
                ดูใบเสนอราคา →
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDeliveryRange(start: string, end: string | null): string {
  const startDate = new Date(start);
  const s = formatThaiDateShort(startDate);
  if (!end) return s;
  const endDate = new Date(end);
  if (startDate.getTime() === endDate.getTime()) return s;
  return `${s} - ${formatThaiDateShort(endDate)}`;
}

function formatThaiDateShort(date: Date): string {
  const MONTHS_SHORT = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const day = date.getUTCDate();
  const month = MONTHS_SHORT[date.getUTCMonth()];
  const year = date.getUTCFullYear() + 543;
  return `${day} ${month} ${year}`;
}
