import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getConfirmedQuotations } from "@/data/documents";

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
  const [companies, customers, quotations] = await Promise.all([
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
    getConfirmedQuotations(),
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
      />
    </div>
  );
}
