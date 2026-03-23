import Link from "next/link";
import { History } from "lucide-react";

import { getStockOverview, getStockStats } from "@/data/stock";
import { getProductCategories } from "@/data/products";
import { Button } from "@/components/ui/button";
import { StockStatsCards } from "@/components/stock/stock-stats-cards";
import { StockTable } from "@/components/stock/stock-table";

export const dynamic = "force-dynamic";

interface StockPageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    stockFilter?: string;
    page?: string;
  }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ products, total }, stats, categories] = await Promise.all([
    getStockOverview({
      search: params.search,
      categoryId: params.categoryId,
      stockFilter: params.stockFilter,
      page,
      perPage: 10,
    }),
    getStockStats(),
    getProductCategories(),
  ]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สต็อคสินค้า</h1>
          <p className="text-muted-foreground text-sm">
            จัดการสต็อคสินค้าทั้งหมด
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/stock/history">
            <History className="size-4" />
            ประวัติทั้งหมด
          </Link>
        </Button>
      </div>

      <StockStatsCards stats={stats} />

      <StockTable
        products={products}
        categories={categories}
        total={total}
        page={page}
        totalPages={totalPages}
        filters={{
          search: params.search ?? "",
          categoryId: params.categoryId ?? "",
          stockFilter: params.stockFilter ?? "",
        }}
      />
    </div>
  );
}
