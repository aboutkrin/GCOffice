import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentTable } from "@/components/documents/document-table";
import { getDocuments } from "@/data/documents";
import { Plus } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function QuotationsPage() {
  const documents = await getDocuments({ type: "QUOTATION" });

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

      <DocumentTable documents={documents} basePath="/quotations" documentType="QUOTATION" />
    </div>
  );
}
