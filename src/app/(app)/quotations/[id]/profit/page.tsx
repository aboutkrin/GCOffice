import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentSummaryCard, type DocumentSummaryData } from "@/components/documents/document-summary-card";
import { DocumentProfitCard } from "@/components/documents/document-profit-card";
import { getDocumentById } from "@/data/documents";
import { getDocumentProfit } from "@/data/document-profit";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Cost & profit of one quotation: the bill as issued (read-only) + the cost card. */
export default async function QuotationProfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect(`/quotations/${id}`);

  const [document, profit] = await Promise.all([getDocumentById(id), getDocumentProfit(id)]);
  if (!document || document.type !== "QUOTATION" || !profit) notFound();

  const summary: DocumentSummaryData = {
    ...document,
    // Live customer data, same as the preview/print page
    customer: (document.customer ?? document.customerSnapshot) as DocumentSummaryData["customer"],
  };

  return (
    <div>
      <PageHeader title="ต้นทุน-กำไรต่อบิล" description={`ใบเสนอราคาเลขที่: ${document.documentNumber ?? "ร่าง"}`} />
      <DocumentSummaryCard doc={summary} basePath="/quotations" />
      <DocumentProfitCard key={JSON.stringify(profit)} profit={profit} />
    </div>
  );
}
