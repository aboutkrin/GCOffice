import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getDocumentById } from "@/data/documents";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";

interface QuotationEditPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function QuotationEditPage({
  params,
}: QuotationEditPageProps) {
  const { id } = await params;

  const [document, companies, customers] = await Promise.all([
    getDocumentById(id),
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title="แก้ไขใบเสนอราคา"
        description={`เลขที่: ${document.documentNumber}`}
      />

      <DocumentForm
        type="QUOTATION"
        initialData={document}
        companies={companies}
        customers={customers}
      />
    </div>
  );
}
