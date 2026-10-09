"use client";

import { useRouter } from "next/navigation";

import { THAI_MONTHS } from "@/lib/thai-date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProfitReportFilters({ year, month, years }: { year: number; month?: number; years: number[] }) {
  const router = useRouter();

  function go(next: { year?: number; month?: string }) {
    const y = next.year ?? year;
    const m = next.month ?? (month ? String(month) : "all");
    router.push(`/profit-report?year=${y}&month=${m}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={month ? String(month) : "all"} onValueChange={(v) => go({ month: v })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งปี</SelectItem>
          {THAI_MONTHS.map((label, i) => (
            <SelectItem key={label} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => go({ year: Number(v) })}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y + 543}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
