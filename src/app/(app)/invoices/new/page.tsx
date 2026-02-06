import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getConfirmedQuotations } from "@/data/documents";
import { getActivePaymentTermTemplates } from "@/data/payment-term-templates";
import { getActiveHolidays } from "@/data/holidays";

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const [companies, customers, quotations, paymentTermTemplates, holidays] = await Promise.all([
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
    getConfirmedQuotations({ year, month }),
    getActivePaymentTermTemplates(),
    getActiveHolidays(),
  ]);

  return (
    <div>
      <PageHeader
        title="สร้างใบแจ้งหนี้"
        description="สร้างใบแจ้งหนี้ใหม่"
      />

      <DocumentForm
        type="INVOICE"
        companies={companies}
        customers={customers}
        quotations={quotations}
        paymentTermTemplates={paymentTermTemplates}
        holidays={holidays}
      />
    </div>
  );
}
