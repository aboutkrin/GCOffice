"use client";

import { useState, useTransition } from "react";
import { FileText, Receipt, Clock, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchYearlyStatsAction } from "@/actions/dashboard-actions";
import type { YearlyStats } from "@/data/dashboard";
import { formatBaht } from "@/lib/thai-currency";

interface YearlyStatsCardsProps {
  initialData: YearlyStats;
}

export function YearlyStatsCards({ initialData }: YearlyStatsCardsProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function handleYearChange(yearStr: string) {
    const year = parseInt(yearStr, 10);
    startTransition(async () => {
      const result = await fetchYearlyStatsAction(year);
      setData(result);
    });
  }

  const cards = [
    {
      title: "ใบเสนอราคา",
      value: data.quotations.toLocaleString(),
      icon: FileText,
    },
    {
      title: "ใบแจ้งหนี้",
      value: data.invoices.toLocaleString(),
      icon: Receipt,
    },
    {
      title: "รอดำเนินการ",
      value: data.pendingDocuments.toLocaleString(),
      icon: Clock,
    },
    {
      title: "ยอดรวม",
      value: formatBaht(data.confirmedTotal),
      icon: Banknote,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">รายปี</h2>
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
      </div>
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${isPending ? "opacity-50" : ""}`}>
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
