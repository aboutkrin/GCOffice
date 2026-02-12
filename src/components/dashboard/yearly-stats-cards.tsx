"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Receipt, Clock, Banknote, CircleDollarSign } from "lucide-react";
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

  const yearParam = `year=${data.year}`;

  const cards = [
    {
      title: "ใบเสนอราคา",
      value: data.quotations.toLocaleString(),
      icon: FileText,
      href: `/quotations?${yearParam}`,
    },
    {
      title: "รอดำเนินการ",
      value: data.pendingDocuments.toLocaleString(),
      icon: Clock,
      href: `/quotations?${yearParam}&status=QUOTED`,
    },
    {
      title: "รอเรียกเก็บ",
      value: data.pendingCollection.toLocaleString(),
      icon: CircleDollarSign,
      href: `/invoices?${yearParam}&status=DEPOSITED`,
    },
    {
      title: "ใบแจ้งหนี้",
      value: data.invoices.toLocaleString(),
      icon: Receipt,
      href: `/invoices?${yearParam}&status=PAID`,
    },
    {
      title: "ยอดรวม",
      value: formatBaht(data.confirmedTotal),
      icon: Banknote,
      href: `/invoices?${yearParam}&status=PAID,DEPOSITED`,
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
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-5 ${isPending ? "opacity-50" : ""}`}>
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
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
          </Link>
        ))}
      </div>
    </div>
  );
}
