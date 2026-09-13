import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getStockDocuments } from "@/data/stock-documents";
import { Button } from "@/components/ui/button";
import { StockDocumentTable } from "@/components/stock/stock-document-table";
import { NewStockDocumentButton } from "@/components/stock/new-stock-document-button";

export const dynamic = "force-dynamic";

interface ReceivePageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function ReceivePage({ searchParams }: ReceivePageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { documents, total } = await getStockDocuments({
    type: "RECEIVE",
    search: params.search,
    page,
    perPage: 20,
  });
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/stock">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">รับเข้าสินค้า</h1>
            <p className="text-muted-foreground text-sm">ประวัติและสร้างเอกสารรับเข้าสินค้า</p>
          </div>
        </div>
        <NewStockDocumentButton type="RECEIVE" label="รับเข้าใหม่" basePath="receive" />
      </div>

      <StockDocumentTable
        documents={documents}
        total={total}
        page={page}
        totalPages={totalPages}
        basePath="receive"
        search={params.search ?? ""}
      />
    </div>
  );
}
