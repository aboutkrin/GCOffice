import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentPageTabs } from "@/components/documents/document-page-tabs";
import { getDocuments } from "@/data/documents";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const documents = await getDocuments({ type: "INVOICE" });
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
        <Link href="/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            สร้างใบแจ้งหนี้
          </Button>
        </Link>
      </PageHeader>

      <DocumentPageTabs
        activeDocuments={activeDocuments}
        cancelledDocuments={cancelledDocuments}
        basePath="/invoices"
        documentType="INVOICE"
      />
    </div>
  );
}
