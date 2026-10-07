import Link from "next/link";
import { History, FileText, ClipboardList, PackagePlus, PackageMinus, ClipboardCheck, QrCode, AlertTriangle } from "lucide-react";

import { getStockOverview, getStockStats } from "@/data/stock";
import { getProductCategories } from "@/data/products";
import { getDraftStockDocumentCounts } from "@/data/stock-documents";
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

  const [{ products, total }, stats, categories, draftCounts] = await Promise.all([
    getStockOverview({
      search: params.search,
      categoryId: params.categoryId,
      stockFilter: params.stockFilter,
      page,
      perPage: 10,
    }),
    getStockStats(),
    getProductCategories(),
    getDraftStockDocumentCounts(),
  ]);

  const drafts = [
    { type: "RECEIVE", label: "รับเข้า", href: "/stock/receive" },
    { type: "ISSUE", label: "เบิกออก", href: "/stock/issue" },
    { type: "COUNT", label: "ตรวจนับ", href: "/stock/count" },
  ].filter((d) => (draftCounts[d.type] ?? 0) > 0);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">สต็อคสินค้า</h1>
          <p className="text-muted-foreground text-sm">
            จัดการสต็อคสินค้าทั้งหมด
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/stock/receive">
              <PackagePlus className="size-4" />
              รับเข้า
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/stock/issue">
              <PackageMinus className="size-4" />
              เบิกออก
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/stock/count">
              <ClipboardCheck className="size-4" />
              ตรวจนับ
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/stock/labels">
              <QrCode className="size-4" />
              พิมพ์ QR
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/stock/summary">
              <ClipboardList className="size-4" />
              สรุปคำสั่งซื้อ
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/stock/report">
              <FileText className="size-4" />
              พิมพ์สต็อค
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/stock/history">
              <History className="size-4" />
              ประวัติทั้งหมด
            </Link>
          </Button>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="size-4 shrink-0" />
          <span>มีเอกสารร่างที่ยังไม่บันทึก สต็อคยังไม่ถูกปรับจนกว่าจะกด &quot;บันทึกและปรับสต็อค&quot;:</span>
          {drafts.map((d) => (
            <Link key={d.type} href={d.href} className="font-medium underline underline-offset-2">
              {d.label} {draftCounts[d.type]} ใบ
            </Link>
          ))}
        </div>
      )}

      <StockStatsCards stats={stats} activeFilter={params.stockFilter ?? ""} />

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
