import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getDocumentById, hasFinalInvoiceForQuotation } from "@/data/documents";
import { getCompanies } from "@/data/companies";
import { getCustomers } from "@/data/customers";
import { getActivePaymentTermTemplates } from "@/data/payment-term-templates";
import { getActiveHolidays } from "@/data/holidays";
import { getDocumentIssueProgress } from "@/data/stock-documents";
import { getDeliveryRounds } from "@/data/delivery-notes";
import { QuotationDeliveryCard } from "@/components/delivery-note/quotation-delivery-card";

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

  const [issueProgress, deliveryRounds, hasFinalInvoice] = await Promise.all([
    getDocumentIssueProgress(id),
    getDeliveryRounds(id),
    hasFinalInvoiceForQuotation(id),
  ]);
  const canDeliver = document.status === "CONFIRMED" || document.status === "SHIPPED";
  const canInvoice = canDeliver && !hasFinalInvoice;

  return (
    <div>
      <PageHeader
        title="แก้ไขใบเสนอราคา"
        description={`เลขที่: ${document.documentNumber ?? "ร่าง"}`}
      >
        {canInvoice && (
          <Link href={`/invoices/new?quotationId=${id}`}>
            <Button variant="outline">
              <FilePlus2 className="h-4 w-4 mr-2" />
              ออกใบแจ้งหนี้
            </Button>
          </Link>
        )}
      </PageHeader>

      <DocumentForm
        type="QUOTATION"
        initialData={document}
        companies={companies}
        customers={customers}
        paymentTermTemplates={paymentTermTemplates}
        holidays={holidays}
      />

      {(canDeliver || deliveryRounds.length > 0) && (
        <QuotationDeliveryCard
          documentId={id}
          progress={issueProgress.filter((line) => line.productId)}
          rounds={deliveryRounds}
          canDeliver={canDeliver}
        />
      )}
    </div>
  );
}
