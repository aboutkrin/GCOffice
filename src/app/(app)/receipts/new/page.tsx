import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getPaidInvoices } from "@/data/documents";
import { getActivePaymentTermTemplates } from "@/data/payment-term-templates";
import { getActiveHolidays } from "@/data/holidays";

export const dynamic = 'force-dynamic';

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const [companies, customers, invoices, paymentTermTemplates, holidays] = await Promise.all([
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
    getPaidInvoices({ year, month }),
    getActivePaymentTermTemplates(),
    getActiveHolidays(),
  ]);

  return (
    <div>
      <PageHeader
        title="สร้างใบเสร็จรับเงิน"
        description="สร้างใบเสร็จรับเงินใหม่"
      />

      <DocumentForm
        type="RECEIPT"
        companies={companies}
        customers={customers}
        invoices={invoices}
        paymentTermTemplates={paymentTermTemplates}
        holidays={holidays}
      />
    </div>
  );
}
