import Link from "next/link";
import { Package, PackageCheck, PackageX, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StockStatsCardsProps {
  stats: {
    totalProducts: number;
    inStock: number;
    outOfStock: number;
    totalReserved?: number;
  };
  /** Current `stockFilter` search param — the matching card is highlighted. */
  activeFilter?: string;
}

export function StockStatsCards({ stats, activeFilter = "" }: StockStatsCardsProps) {
  const cards = [
    {
      label: "สินค้าทั้งหมด",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-500",
      filter: "",
    },
    {
      label: "มีสินค้า",
      value: stats.inStock,
      icon: PackageCheck,
      color: "text-green-600",
      bg: "bg-green-50",
      ring: "ring-green-500",
      filter: "in_stock",
    },
    {
      label: "สินค้าหมด",
      value: stats.outOfStock,
      icon: PackageX,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-500",
      filter: "out_of_stock",
    },
    ...(stats.totalReserved != null
      ? [
          {
            label: "จองทั้งหมด (กล่อง)",
            value: stats.totalReserved,
            icon: Lock,
            color: "text-purple-600",
            bg: "bg-purple-50",
            ring: "ring-purple-500",
            filter: "reserved",
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.filter ? `/stock?stockFilter=${card.filter}` : "/stock"}
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card
            className={cn(
              "h-full transition-colors hover:bg-muted/50",
              activeFilter === card.filter && `ring-2 ${card.ring}`,
            )}
          >
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
        </Link>
      ))}
    </div>
  );
}
