import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentPageTabs } from "@/components/documents/document-page-tabs";
import { MonthPicker } from "@/components/documents/month-picker";
import { StatusFilter } from "@/components/documents/status-filter";
import { getDocuments } from "@/data/documents";
import { DocumentStatus } from "@/generated/prisma/client";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; status?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : (params.year ? undefined : now.getMonth() + 1);

  const statusFilter = params.status
    ? params.status.split(",").filter((s): s is DocumentStatus => s in DocumentStatus)
    : undefined;

  const documents = await getDocuments({
    type: "INVOICE",
    year,
    month,
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : statusFilter,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeDocuments = documents.filter((doc: any) => doc.status !== "CANCELLED");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelledDocuments = documents.filter((doc: any) => doc.status === "CANCELLED");

  return (
    <div>
      <PageHeader
        title="ใบแจ้งหนี้"
        description="จัดการใบแจ้งหนี้ทั้งหมด"
      >
        <Link href={`/invoices/new?year=${year}${month ? `&month=${month}` : ''}`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            สร้างใบแจ้งหนี้
          </Button>
        </Link>
      </PageHeader>

      <div className="mb-4 flex items-center justify-between gap-4">
        <MonthPicker basePath="/invoices" year={year} month={month} />
        <StatusFilter basePath="/invoices" statuses={statusFilter || []} />
      </div>

      <DocumentPageTabs
        activeDocuments={activeDocuments}
        cancelledDocuments={cancelledDocuments}
        basePath="/invoices"
        documentType="INVOICE"
      />
    </div>
  );
}
