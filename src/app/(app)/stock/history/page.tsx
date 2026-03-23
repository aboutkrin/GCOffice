import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getStockMovements } from "@/data/stock";
import { Button } from "@/components/ui/button";
import { StockMovementTable } from "@/components/stock/stock-movement-table";

export const dynamic = "force-dynamic";

interface StockHistoryPageProps {
  searchParams: Promise<{
    type?: string;
    page?: string;
  }>;
}

export default async function StockHistoryPage({ searchParams }: StockHistoryPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { movements, total } = await getStockMovements({
    type: params.type,
    page,
    perPage: 20,
  });

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/stock">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">ประวัติการเคลื่อนไหวสต็อค</h1>
          <p className="text-muted-foreground text-sm">
            ดูประวัติการรับเข้า เบิกออก และปรับยอดสต็อคทั้งหมด
          </p>
        </div>
      </div>

      <StockMovementTable
        movements={movements}
        total={total}
        page={page}
        totalPages={totalPages}
        showProduct={true}
        typeFilter={params.type ?? ""}
      />
    </div>
  );
}
