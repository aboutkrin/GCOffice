import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getProductStock, getStockMovements } from "@/data/stock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STOCK_STATUS_LABELS, STOCK_STATUS_COLORS } from "@/lib/constants";
import { StockMovementTable } from "@/components/stock/stock-movement-table";

export const dynamic = "force-dynamic";

interface ProductStockPageProps {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{
    type?: string;
    page?: string;
  }>;
}

function getStockStatus(product: any): string {
  if (product.stockQuantity === 0) return "OUT_OF_STOCK";
  if (product.stockQuantity <= product.lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

export default async function ProductStockPage({
  params,
  searchParams,
}: ProductStockPageProps) {
  const { productId } = await params;
  const searchPrms = await searchParams;
  const page = Math.max(1, Number(searchPrms.page) || 1);

  const product = await getProductStock(productId);
  if (!product) notFound();

  const { movements, total } = await getStockMovements({
    productId,
    type: searchPrms.type,
    page,
    perPage: 20,
  });

  const totalPages = Math.ceil(total / 20);
  const status = getStockStatus(product);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/stock">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">สต็อค: {product.name}</h1>
          <p className="text-muted-foreground text-sm">
            {product.sku} — {product.category?.name ?? "ไม่มีหมวดหมู่"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              สต็อคปัจจุบัน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{product.stockQuantity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              จุดแจ้งเตือน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{product.lowStockThreshold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              สถานะ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`text-base px-3 py-1 ${STOCK_STATUS_COLORS[status]}`}>
              {STOCK_STATUS_LABELS[status]}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">ประวัติการเคลื่อนไหว</h2>
        <StockMovementTable
          movements={movements}
          total={total}
          page={page}
          totalPages={totalPages}
          showProduct={false}
          typeFilter={searchPrms.type ?? ""}
        />
      </div>
    </div>
  );
}
