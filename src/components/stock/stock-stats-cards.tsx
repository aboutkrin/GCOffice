"use client";

import { Package, PackageCheck, PackageX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StockStatsCardsProps {
  stats: {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalReorderQuantity: number;
  };
}

export function StockStatsCards({ stats }: StockStatsCardsProps) {
  const cards = [
    {
      label: "สินค้าทั้งหมด",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "มีสินค้า",
      value: stats.inStock,
      icon: PackageCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "สินค้าหมด",
      value: stats.outOfStock,
      icon: PackageX,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`size-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
