import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";

export const dynamic = 'force-dynamic';

export default async function NewQuotationPage() {
  const [companies, customers] = await Promise.all([
    getCompanies(),
    getCustomers({ status: "ACTIVE" }),
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
      />
    </div>
  );
}
