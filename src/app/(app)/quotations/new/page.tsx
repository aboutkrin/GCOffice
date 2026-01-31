import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getActivePaymentTermTemplates } from "@/data/payment-term-templates";
import { getActiveHolidays } from "@/data/holidays";

export const dynamic = 'force-dynamic';

export default async function NewQuotationPage() {
  const [companies, customers, paymentTermTemplates, holidays] = await Promise.all([
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
    getActivePaymentTermTemplates(),
    getActiveHolidays(),
  ]);

  return (
    <div>
      <PageHeader
        title="สร้างใบเสนอราคา"
        description="สร้างใบเสนอราคาใหม่"
      />

      <DocumentForm
        type="QUOTATION"
        companies={companies}
        customers={customers}
        paymentTermTemplates={paymentTermTemplates}
        holidays={holidays}
      />
    </div>
  );
}
