import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getInventorySummary } from "@/data/stock";
import { Button } from "@/components/ui/button";
import { InventorySummaryStats } from "@/components/stock/inventory-summary-stats";
import { InventorySummaryTable } from "@/components/stock/inventory-summary-table";

export const dynamic = "force-dynamic";

interface SummaryPageProps {
  searchParams: Promise<{
    search?: string;
    shortageOnly?: string;
  }>;
}

export default async function InventorySummaryPage({
  searchParams,
}: SummaryPageProps) {
  const params = await searchParams;
  const { items, stats } = await getInventorySummary();

  // Apply server-side filtering
  let filtered = items;

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (item: any) =>
        item.productName.toLowerCase().includes(q) ||
        item.productSku.toLowerCase().includes(q),
    );
  }

  if (params.shortageOnly === "true") {
    filtered = filtered.filter((item: any) => item.shortage > 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/stock">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">สรุปคำสั่งซื้อ vs สต็อค</h1>
            <p className="text-muted-foreground text-sm">
              เปรียบเทียบออเดอร์ลูกค้ากับสต็อคปัจจุบัน
            </p>
          </div>
        </div>
      </div>

      <InventorySummaryStats stats={stats} />

      <InventorySummaryTable
        items={filtered}
        filters={{
          search: params.search ?? "",
          shortageOnly: params.shortageOnly === "true",
        }}
      />
    </div>
  );
}
