"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchMonthlyRevenueExpenseAction } from "@/actions/dashboard-actions";
import type { MonthlyRevenueExpenseData, MonthlyRevenueExpenseResult } from "@/data/dashboard";
import { formatBaht } from "@/lib/thai-currency";
import { cn } from "@/lib/utils";
import { financeMonthHref } from "@/lib/finance";

const COLORS = {
  revenue: "oklch(0.45 0.15 260)",
  productCost: "oklch(0.55 0.2 25)",
  operatingExpense: "oklch(0.75 0.14 65)",
  profit: "oklch(0.6 0.118 150)",
};

const chartConfig = {
  revenue: { label: "รายได้", color: COLORS.revenue },
  productCost: { label: "ต้นทุนสินค้า + ค่าส่ง", color: COLORS.productCost },
  operatingExpense: { label: "ค่าใช้จ่ายประจำ", color: COLORS.operatingExpense },
  profit: { label: "กำไรสุทธิ", color: COLORS.profit },
} satisfies ChartConfig;

/** 1234567 → "1.2M", 45000 → "45k" */
function compact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return Math.round(value).toString();
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyRevenueExpenseData }>;
  label?: string;
}

function MonthTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows: { label: string; value: number; color?: string; muted?: boolean }[] = [
    { label: "ยอดขายรวม VAT", value: d.revenue + d.vat, muted: true },
    { label: "รายได้ (ไม่รวม VAT)", value: d.revenue, color: COLORS.revenue },
    { label: "ต้นทุนสินค้า + ค่าส่ง", value: d.productCost, color: COLORS.productCost },
    { label: "ค่าใช้จ่ายประจำ", value: d.operatingExpense, color: COLORS.operatingExpense },
  ];
  return (
    <div className="min-w-[220px] rounded-lg border bg-background px-4 py-3 text-sm shadow-md">
      <p className="mb-2 font-semibold">{label}</p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.color && <span className="size-2 rounded-[2px]" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className={cn("font-medium tabular-nums", r.muted && "text-muted-foreground")}>
              {formatBaht(r.value)}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t pt-1.5">
          <span className="text-muted-foreground">กำไรสุทธิ</span>
          <span className={cn("font-semibold tabular-nums", d.profit >= 0 ? "text-green-600" : "text-red-600")}>
            {formatBaht(d.profit)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">กดเพื่อดูรายละเอียดเดือนนี้</p>
    </div>
  );
}

interface RevenueExpenseSectionProps {
  initialData: MonthlyRevenueExpenseResult;
  /** Current Thai year / month (from the server, not the browser clock) */
  currentYear: number;
  currentMonth: number;
}

export function RevenueExpenseSection({ initialData, currentYear, currentMonth }: RevenueExpenseSectionProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function handleYearChange(yearStr: string) {
    const year = parseInt(yearStr, 10);
    startTransition(async () => {
      const result = await fetchMonthlyRevenueExpenseAction(year);
      setData(result);
    });
  }

  const isCurrentYear = data.year === currentYear;
  const thisMonth = isCurrentYear ? data.monthlyData[currentMonth - 1] : null;
  const headlineProfit = thisMonth ? thisMonth.profit : data.totalProfit;
  // Months still to come this year are hidden from the table
  const lastMonth = isCurrentYear ? currentMonth : 12;
  const tableMonths = data.monthlyData.slice(0, lastMonth).reverse();

  const kpis = [
    { label: "รายได้", value: data.totalRevenue, color: COLORS.revenue, sub: `VAT ${formatBaht(data.totalVat)}` },
    { label: "ต้นทุนสินค้า + ค่าส่ง", value: data.totalProductCost, color: COLORS.productCost },
    { label: "ค่าใช้จ่ายประจำ", value: data.totalOperatingExpense, color: COLORS.operatingExpense },
    { label: "กำไรสุทธิ", value: data.totalProfit, profit: true },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="min-w-0 lg:col-span-3">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold">ภาพรวมรายรับและรายจ่ายตลอดทั้งปี</CardTitle>
            <Select value={data.year.toString()} onValueChange={handleYearChange} disabled={isPending}>
              <SelectTrigger className="w-[120px] shrink-0 sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.availableYears.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    พ.ศ. {y + 543}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-6">
            {kpis.map((k) => (
              <div key={k.label} className="min-w-0">
                <span className="text-xs text-muted-foreground sm:text-sm">{k.label}</span>
                <p
                  className={cn(
                    "break-all text-sm font-bold tabular-nums sm:text-lg",
                    k.profit && (k.value >= 0 ? "text-green-600" : "text-red-600")
                  )}
                  style={k.color ? { color: k.color } : undefined}
                >
                  {formatBaht(k.value)}
                </p>
                {k.sub && <p className="text-xs text-muted-foreground tabular-nums">{k.sub}</p>}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full sm:h-[300px]">
            <ComposedChart
              data={data.monthlyData}
              margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
              barGap={2}
              className="cursor-pointer"
              onClick={(state) => {
                const index = Number(state?.activeTooltipIndex ?? state?.activeIndex);
                if (Number.isInteger(index) && index >= 0 && index < 12) {
                  router.push(financeMonthHref(data.year, index + 1));
                }
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={compact} width={44} />
              <Tooltip content={<MonthTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="productCost" stackId="cost" fill="var(--color-productCost)" maxBarSize={18} />
              <Bar
                dataKey="operatingExpense"
                stackId="cost"
                fill="var(--color-operatingExpense)"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Line
                dataKey="profit"
                type="monotone"
                stroke="var(--color-profit)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--background)" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map((key) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className={cn("rounded-[2px]", key === "profit" ? "h-[3px] w-3" : "size-2.5")}
                  style={{ background: chartConfig[key].color }}
                />
                {chartConfig[key].label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">
              {thisMonth ? `กำไรสุทธิเดือนนี้ (${thisMonth.monthLabel})` : `กำไรสุทธิ พ.ศ. ${data.yearBE}`}
            </CardTitle>
            <p className={cn("text-2xl font-bold tabular-nums", headlineProfit >= 0 ? "text-green-600" : "text-red-600")}>
              {formatBaht(headlineProfit)}
            </p>
          </div>
          {thisMonth && (
            <div className="min-w-0 sm:text-right">
              <span className="text-sm text-muted-foreground">กำไรรวมทั้งปี</span>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums",
                  data.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatBaht(data.totalProfit)}
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[3rem_1fr_1fr_1fr_1rem] gap-x-2 border-b pb-1 text-right text-xs text-muted-foreground">
            <span className="text-left">เดือน</span>
            <span>รายได้</span>
            <span>รายจ่าย</span>
            <span>กำไร</span>
            <span />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {tableMonths.map((m) => {
              const empty = m.revenue === 0 && m.expense === 0;
              const isNow = isCurrentYear && m.month === currentMonth;
              return (
                <Link
                  key={m.month}
                  href={financeMonthHref(data.year, m.month)}
                  className={cn(
                    "grid grid-cols-[3rem_1fr_1fr_1fr_1rem] items-center gap-x-2 border-b py-2 text-right text-sm tabular-nums transition-colors hover:bg-accent/50",
                    isNow && "font-semibold",
                    empty && "text-muted-foreground"
                  )}
                >
                  <span className="text-left">{m.monthLabel}</span>
                  <span>{empty ? "–" : compact(m.revenue)}</span>
                  <span>{empty ? "–" : compact(m.expense)}</span>
                  <span className={cn(!empty && (m.profit >= 0 ? "text-green-600" : "text-red-600"))}>
                    {empty ? "–" : compact(m.profit)}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">กดที่เดือนหรือแท่งกราฟเพื่อดูรายละเอียด</p>
        </CardContent>
      </Card>
    </div>
  );
}
