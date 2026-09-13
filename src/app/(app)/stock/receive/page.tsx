import { getStockDocuments } from "@/data/stock-documents";
import { StockDocumentTable } from "@/components/stock/stock-document-table";
import { NewStockDocumentButton } from "@/components/stock/new-stock-document-button";
import { StockDocTabs } from "@/components/stock/stock-doc-tabs";

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">รับเข้าสินค้า</h1>
          <p className="text-muted-foreground text-sm">ประวัติและสร้างเอกสารรับเข้าสินค้า</p>
        </div>
        <NewStockDocumentButton type="RECEIVE" label="รับเข้าใหม่" basePath="receive" />
      </div>

      <StockDocTabs active="receive" />

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
