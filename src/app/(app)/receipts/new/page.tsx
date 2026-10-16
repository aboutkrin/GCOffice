import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getReceiptInvoices } from "@/data/documents";
import { getActivePaymentTermTemplates } from "@/data/payment-term-templates";
import { getActiveHolidays } from "@/data/holidays";

export const dynamic = 'force-dynamic';

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const { invoiceId } = await searchParams;
  const [companies, customers, invoices, paymentTermTemplates, holidays] = await Promise.all([
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
    getReceiptInvoices(),
    getActivePaymentTermTemplates(),
    getActiveHolidays(),
  ]);

  return (
    <div>
      <PageHeader
        title="สร้างใบเสร็จรับเงิน"
        description={invoiceId ? "ออกใบเสร็จยอดคงเหลือตามใบแจ้งหนี้" : "สร้างใบเสร็จรับเงินใหม่"}
      />

      <DocumentForm
        type="RECEIPT"
        companies={companies}
        customers={customers}
        invoices={invoices}
        initialInvoiceId={invoiceId}
        paymentTermTemplates={paymentTermTemplates}
        holidays={holidays}
      />
    </div>
  );
}
