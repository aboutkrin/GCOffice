import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentPageTabs } from "@/components/documents/document-page-tabs";
import { MonthPicker } from "@/components/documents/month-picker";
import { getDocuments } from "@/data/documents";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const documents = await getDocuments({ type: "QUOTATION", year, month });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeDocuments = documents.filter((doc: any) => doc.status !== "CANCELLED");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelledDocuments = documents.filter((doc: any) => doc.status === "CANCELLED");

  return (
    <div>
      <PageHeader
        title="ใบเสนอราคา"
        description="จัดการใบเสนอราคาทั้งหมด"
      >
        <Link href={`/quotations/new?year=${year}&month=${month}`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            สร้างใบเสนอราคา
          </Button>
        </Link>
      </PageHeader>

      <div className="mb-4">
        <MonthPicker basePath="/quotations" year={year} month={month} />
      </div>

      <DocumentPageTabs
        activeDocuments={activeDocuments}
        cancelledDocuments={cancelledDocuments}
        basePath="/quotations"
        documentType="QUOTATION"
      />
    </div>
  );
}
