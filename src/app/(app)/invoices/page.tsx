import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentTable } from "@/components/documents/document-table";
import { getDocuments } from "@/data/documents";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const documents = await getDocuments({ type: "INVOICE" });

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

      <DocumentTable documents={documents} basePath="/invoices" documentType="INVOICE" />
    </div>
  );
}
