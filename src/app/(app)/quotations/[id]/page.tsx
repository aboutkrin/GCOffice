import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getDocumentById } from "@/data/documents";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getActivePaymentTermTemplates } from "@/data/payment-term-templates";
import { getActiveHolidays } from "@/data/holidays";

interface QuotationEditPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function QuotationEditPage({
  params,
}: QuotationEditPageProps) {
  const { id } = await params;

  const [document, companies, customers, paymentTermTemplates, holidays] = await Promise.all([
    getDocumentById(id),
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
    getActivePaymentTermTemplates(),
    getActiveHolidays(),
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
        paymentTermTemplates={paymentTermTemplates}
        holidays={holidays}
      />
    </div>
  );
}
