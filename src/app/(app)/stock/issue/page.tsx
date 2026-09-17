import { getStockDocuments } from "@/data/stock-documents";
import { StockDocumentTable } from "@/components/stock/stock-document-table";
import { NewStockDocumentButton } from "@/components/stock/new-stock-document-button";
import { IssueSourcePicker } from "@/components/stock/issue-source-picker";
import { StockDocTabs } from "@/components/stock/stock-doc-tabs";

export const dynamic = "force-dynamic";

interface IssuePageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function IssuePage({ searchParams }: IssuePageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { documents, total } = await getStockDocuments({
    type: "ISSUE",
    search: params.search,
    page,
    perPage: 20,
  });
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">เบิกออกสินค้า</h1>
          <p className="text-muted-foreground text-sm">ประวัติและสร้างเอกสารเบิกออกสินค้า</p>
        </div>
        <div className="flex items-center gap-2">
          <IssueSourcePicker />
          <NewStockDocumentButton type="ISSUE" label="เบิกอิสระ" basePath="issue" variant="outline" />
        </div>
      </div>

      <StockDocTabs active="issue" />

      <StockDocumentTable
        documents={documents}
        total={total}
        page={page}
        totalPages={totalPages}
        basePath="issue"
        search={params.search ?? ""}
      />
    </div>
  );
}
