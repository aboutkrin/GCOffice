"use client";

import { ClipboardList, AlertTriangle, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface InventorySummaryStatsProps {
  stats: {
    totalProductsWithOrders: number;
    totalShortageItems: number;
    totalShortageQuantity: number;
  };
}

export function InventorySummaryStats({ stats }: InventorySummaryStatsProps) {
  const cards = [
    {
      label: "สินค้าที่มีออเดอร์",
      value: stats.totalProductsWithOrders,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "สต็อคไม่เพียงพอ",
      value: stats.totalShortageItems,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "ต้องสั่งเพิ่มรวม (ชิ้น)",
      value: stats.totalShortageQuantity,
      icon: ShoppingCart,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
