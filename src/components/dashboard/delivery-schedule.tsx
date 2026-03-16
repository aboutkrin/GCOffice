"use client";

import { useState, useTransition, useMemo } from "react";
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
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
];

const SHIPPED_BAR_COLOR = "bg-gray-200 text-gray-500 border-gray-300";

function getBarColor(index: number, status: string) {
  if (status === "SHIPPED") return SHIPPED_BAR_COLOR;
  return BAR_COLORS[index % BAR_COLORS.length];
}

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateObj: Date;
}

function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const startDow = firstDay.getUTCDay();
  const daysInMonth = lastDay.getUTCDate();

  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const days: CalendarDay[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: false,
      dateObj: new Date(Date.UTC(year, month - 2, d)),
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(Date.UTC(year, month - 1, d));
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: dateObj.getTime() === todayUTC,
      dateObj,
    });
  }

  // Next month padding
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        dateObj: new Date(Date.UTC(year, month, d)),
      });
    }
  }

  return days;
}

interface DeliveryBar {
  item: DeliveryScheduleItem;
  colorClass: string;
  startCol: number; // 0-6 within the week row
  span: number; // how many cells to span
  isStart: boolean; // shows name
  isEnd: boolean;
}

function computeDeliveryBars(
  items: DeliveryScheduleItem[],
  weekDays: CalendarDay[]
): DeliveryBar[][] {
  // weekDays is a 7-day array for one week row
  const weekStart = weekDays[0].dateObj.getTime();
  const weekEnd = weekDays[6].dateObj.getTime();
  const lanes: DeliveryBar[][] = [];

  items.forEach((item, idx) => {
    const itemStart = new Date(item.deliveryDateStart).getTime();
    const itemEnd = item.deliveryDateEnd
      ? new Date(item.deliveryDateEnd).getTime()
      : itemStart;

    // Check overlap with this week
    if (itemEnd < weekStart || itemStart > weekEnd) return;

    const clampedStart = Math.max(itemStart, weekStart);
    const clampedEnd = Math.min(itemEnd, weekEnd);

    const startCol = weekDays.findIndex(
      (d) => d.dateObj.getTime() >= clampedStart
    );
    const endCol =
      weekDays.length -
      1 -
      [...weekDays].reverse().findIndex((d) => d.dateObj.getTime() <= clampedEnd);

    if (startCol < 0 || endCol < 0) return;

    const bar: DeliveryBar = {
      item,
      colorClass: getBarColor(idx, item.status),
      startCol,
      span: endCol - startCol + 1,
      isStart: itemStart >= weekStart,
      isEnd: itemEnd <= weekEnd,
    };

    // Find available lane
    let placed = false;
    for (const lane of lanes) {
      const conflict = lane.some(
        (b) =>
          !(bar.startCol >= b.startCol + b.span || bar.startCol + bar.span <= b.startCol)
      );
      if (!conflict) {
        lane.push(bar);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([bar]);
    }
  });

  return lanes;
}

function isHolidayDate(dateObj: Date, holidays: HolidayItem[]): HolidayItem | undefined {
  const dateStr = dateObj.toISOString().slice(0, 10);
  return holidays.find((h) => h.date.slice(0, 10) === dateStr);
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

  const calendarDays = useMemo(() => buildCalendarDays(year, month), [year, month]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

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
      // Update local state
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "SHIPPED" } : item
        )
      );
      // Update selected item too
      setSelectedItem((prev) =>
        prev && prev.id === id ? { ...prev, status: "SHIPPED" } : prev
      );
    } catch (error) {
      console.error("Failed to mark as shipped:", error);
    } finally {
      setIsShipping(false);
    }
  }

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

          {/* Day of week headers */}
          <div className="grid grid-cols-7">
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "text-center text-xs font-medium py-1",
                  i === 0 ? "text-red-500" : "text-muted-foreground",
                  i > 0 && "border-l border-gray-200"
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="border-t">
            {weeks.map((week, weekIdx) => {
              const lanes = computeDeliveryBars(data, week);
              return (
                <div key={weekIdx} className="border-b">
                  {/* Date number row */}
                  <div className="grid grid-cols-7">
                    {week.map((day, dayIdx) => {
                      const holiday = day.isCurrentMonth
                        ? isHolidayDate(day.dateObj, holidays)
                        : undefined;
                      return (
                        <div
                          key={dayIdx}
                          className={cn(
                            "text-center px-1 pt-1 pb-0 text-sm min-h-[28px] relative",
                            dayIdx > 0 && "border-l border-gray-200",
                            !day.isCurrentMonth && "text-muted-foreground/40",
                            dayIdx === 0 && day.isCurrentMonth && "text-red-500",
                            holiday && "bg-red-50"
                          )}
                          title={holiday?.name}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs",
                              day.isToday &&
                                "bg-red-500 text-white font-bold"
                            )}
                          >
                            {day.date}
                          </span>
                          {holiday && (
                            <div className="text-[9px] text-red-500 leading-tight truncate px-0.5">
                              {holiday.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Delivery bars */}
                  <div className="relative min-h-[4px]">
                    {lanes.map((lane, laneIdx) =>
                      lane.map((bar) => (
                        <div
                          key={`${bar.item.id}-${weekIdx}-${laneIdx}`}
                          className="grid grid-cols-7"
                        >
                          {bar.startCol > 0 && (
                            <div
                              style={{ gridColumn: `span ${bar.startCol}` }}
                            />
                          )}
                          <button
                            onClick={() => setSelectedItem(bar.item)}
                            style={{ gridColumn: `span ${bar.span}` }}
                            className={cn(
                              "flex items-center text-[11px] leading-tight h-5 px-1.5 mb-0.5 cursor-pointer border transition-colors hover:opacity-80",
                              bar.colorClass,
                              bar.isStart ? "rounded-l-md ml-0.5" : "",
                              bar.isEnd ? "rounded-r-md mr-0.5" : ""
                            )}
                            title={bar.item.customerName}
                          >
                            <span className="truncate flex-1 text-left">
                              {bar.isStart && bar.item.customerName}
                            </span>
                            {bar.isEnd && !bar.isStart && (
                              <span className="truncate text-right ml-1 font-medium">
                                {bar.item.customerName}
                              </span>
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {data.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              ไม่มีกำหนดส่งสินค้าในเดือนนี้
            </div>
          )}
          {data.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              รวม {data.length} รายการส่งสินค้าในเดือนนี้
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
