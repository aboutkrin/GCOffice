import { notFound } from "next/navigation";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { IssuedReceiptsList } from "@/components/documents/issued-receipts";

interface InvoiceEditPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function InvoiceEditPage({
  params,
}: InvoiceEditPageProps) {
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
        title="แก้ไขใบแจ้งหนี้"
        description={`เลขที่: ${document.documentNumber ?? "ร่าง"}`}
      >
        {document.status === "DEPOSITED" && (
          <Link href={`/receipts/new?invoiceId=${document.id}`}>
            <Button variant="outline">
              <Receipt className="h-4 w-4 mr-2" />
              ออกใบเสร็จยอดคงเหลือ
            </Button>
          </Link>
        )}
      </PageHeader>

      {document.receipts?.length > 0 && (
        <div className="mb-6 space-y-2 rounded-lg border p-4">
          <p className="font-medium">ใบเสร็จรับเงินของใบแจ้งหนี้นี้</p>
          <IssuedReceiptsList receipts={document.receipts} />
        </div>
      )}

      <DocumentForm
        type="INVOICE"
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
