"use client";

import { useState, useTransition } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchMonthlyRevenueExpenseAction } from "@/actions/dashboard-actions";
import type { MonthlyRevenueExpenseResult } from "@/data/dashboard";
import { formatBaht } from "@/lib/thai-currency";

const lineChartConfig = {
  revenue: {
    label: "รายได้",
    color: "oklch(0.45 0.15 260)",
  },
  expense: {
    label: "ต้นทุน",
    color: "oklch(0.55 0.2 25)",
  },
} satisfies ChartConfig;

const profitChartConfig = {
  profit: {
    label: "กำไร",
    color: "oklch(0.6 0.118 150)",
  },
} satisfies ChartConfig;

interface RevenueExpenseSectionProps {
  initialData: MonthlyRevenueExpenseResult;
}

export function RevenueExpenseSection({ initialData }: RevenueExpenseSectionProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function handleYearChange(yearStr: string) {
    const year = parseInt(yearStr, 10);
    startTransition(async () => {
      const result = await fetchMonthlyRevenueExpenseAction(year);
      setData(result);
    });
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const isCurrentYear = data.year === now.getFullYear();
  const thisMonthProfit = isCurrentYear
    ? data.monthlyData[currentMonth]?.profit ?? 0
    : data.totalProfit;
  const isPositive = thisMonthProfit >= 0;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Revenue & Expense Line Chart - takes 3/5 width */}
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              ภาพรวมรายรับและรายจ่ายตลอดทั้งปี
            </CardTitle>
            <div className="flex gap-6 mt-2">
              <div>
                <span className="text-sm text-muted-foreground">รายได้</span>
                <p className="text-lg font-bold text-[oklch(0.45_0.15_260)]">
                  {formatBaht(data.totalRevenue)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">VAT</span>
                <p className="text-lg font-bold text-muted-foreground">
                  {formatBaht(data.totalVat)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">ต้นทุน</span>
                <p className="text-lg font-bold text-[oklch(0.55_0.2_25)]">
                  {formatBaht(data.totalExpense)}
                </p>
              </div>
            </div>
          </div>
          <Select
            value={data.year.toString()}
            onValueChange={handleYearChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-[140px]">
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
        </CardHeader>
        <CardContent>
          <ChartContainer config={lineChartConfig} className="aspect-auto h-[300px] w-full">
            <LineChart
              data={data.monthlyData}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  value >= 1000000
                    ? `${(value / 1000000).toFixed(1)}M`
                    : value >= 1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value.toString()
                }
                width={50}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const label = name === "revenue" ? "รายได้" : "ต้นทุน";
                      return `${label}: ${formatBaht(value as number)}`;
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent payload={[]} />} />
              <Line
                dataKey="revenue"
                type="monotone"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                dataKey="expense"
                type="monotone"
                stroke="var(--color-expense)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Profit Bar Chart - takes 2/5 width */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {isCurrentYear ? "กำไรเดือนนี้" : `กำไรรวม พ.ศ. ${data.yearBE}`}
            </CardTitle>
            <p
              className={`text-2xl font-bold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatBaht(thisMonthProfit)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">กำไรรวมทุกเดือน</span>
            <p
              className={`text-lg font-bold ${
                data.totalProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatBaht(data.totalProfit)}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={profitChartConfig} className="aspect-auto h-[300px] w-full">
            <BarChart
              data={data.monthlyData}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => {
                  const abs = Math.abs(value);
                  if (abs >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (abs >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toString();
                }}
                width={50}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `กำไร: ${formatBaht(value as number)}`}
                    hideIndicator
                  />
                }
              />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {data.monthlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.profit >= 0 ? "oklch(0.6 0.118 150)" : "oklch(0.55 0.2 25)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
