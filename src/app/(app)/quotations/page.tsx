import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentPageTabs } from "@/components/documents/document-page-tabs";
import { getDocuments } from "@/data/documents";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function QuotationsPage() {
  const documents = await getDocuments({ type: "QUOTATION" });
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
        <Link href="/quotations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            สร้างใบเสนอราคา
          </Button>
        </Link>
      </PageHeader>

      <DocumentPageTabs
        activeDocuments={activeDocuments}
        cancelledDocuments={cancelledDocuments}
        basePath="/quotations"
        documentType="QUOTATION"
      />
    </div>
  );
}
