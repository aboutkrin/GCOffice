import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getDocumentById } from "@/data/documents";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getActivePaymentTermTemplates } from "@/data/payment-term-templates";
import { getActiveHolidays } from "@/data/holidays";
import { getDocumentProfit } from "@/data/document-profit";
import { getCurrentUser } from "@/lib/auth";
import { DocumentProfitCard } from "@/components/documents/document-profit-card";

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

  const user = await getCurrentUser();
  const profit =
    user?.role === "ADMIN" && !document.isDepositInvoice ? await getDocumentProfit(id) : null;

  return (
    <div>
      <PageHeader
        title="แก้ไขใบเสนอราคา"
        description={`เลขที่: ${document.documentNumber ?? "ร่าง"}`}
      />

      <DocumentForm
        type="QUOTATION"
        initialData={document}
        companies={companies}
        customers={customers}
        paymentTermTemplates={paymentTermTemplates}
        holidays={holidays}
      />

      {profit && <DocumentProfitCard key={JSON.stringify(profit)} profit={profit} />}
    </div>
  );
}
