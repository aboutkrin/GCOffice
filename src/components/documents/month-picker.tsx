"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface MonthPickerProps {
  basePath: string;
  year: number;
  month?: number;
}

export function MonthPicker({ basePath, year, month }: MonthPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buddhistYear = year + 543;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth = month !== undefined && year === currentYear && month === currentMonth;
  const isYearMode = month === undefined;

  function navigate(newYear: number, newMonth?: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", newYear.toString());
    if (newMonth !== undefined) {
      params.set("month", newMonth.toString());
    } else {
      params.delete("month");
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function goToPreviousMonth() {
    if (isYearMode) {
      navigate(year - 1);
    } else if (month === 1) {
      navigate(year - 1, 12);
    } else {
      navigate(year, month! - 1);
    }
  }

  function goToNextMonth() {
    if (isYearMode) {
      navigate(year + 1);
    } else if (month === 12) {
      navigate(year + 1, 1);
    } else {
      navigate(year, month! + 1);
    }
  }

  function goToCurrentMonth() {
    navigate(currentYear, currentMonth);
  }

  const isAtCurrentLimit = isYearMode
    ? year >= currentYear
    : year === currentYear && month === currentMonth;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[140px] text-center">
        {isYearMode ? `ทั้งปี ${buddhistYear}` : `${THAI_MONTHS[month - 1]} ${buddhistYear}`}
      </span>
      <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isAtCurrentLimit} className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrentMonth && (
        <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="text-xs">
          เดือนนี้
        </Button>
      )}
    </div>
  );
}
