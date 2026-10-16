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

  const cards: {
    title: string;
    value: string;
    subtitle?: string;
    icon: typeof FileText;
    href: string;
  }[] = [
    {
      title: "ใบเสนอราคา",
      value: data.quotations.toLocaleString(),
      icon: FileText,
      href: `/quotations?${yearParam}&excludeStatus=DRAFT`,
    },
    {
      title: "รอดำเนินการ",
      value: data.pendingDocuments.toLocaleString(),
      icon: Clock,
      href: `/quotations?${yearParam}&status=QUOTED,BILLED`,
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
      title: "ยอดขาย",
      value: formatBaht(data.confirmedTotal),
      subtitle: `ยอดไม่รวม VAT ${formatBaht(data.vatTotal)}`,
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
      <div className={`grid grid-cols-4 gap-2 md:gap-4 lg:grid-cols-5 ${isPending ? "opacity-50" : ""}`}>
        {cards.map((card, index) => (
          <Link
            key={card.title}
            href={card.href}
            className={index === cards.length - 1 ? "col-span-4 lg:col-span-1" : ""}
          >
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full gap-2 py-3 md:gap-6 md:py-6">
              <CardHeader className="flex flex-row items-center justify-between px-3 pb-1 md:px-6 md:pb-2">
                <CardTitle className="text-[11px] leading-tight md:text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="hidden md:block h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                <p className="text-base md:text-2xl font-bold">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
