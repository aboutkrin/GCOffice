import { notFound } from "next/navigation";
import { getStockDocument } from "@/data/stock-documents";
import { StockDocumentSession } from "@/components/stock/stock-document-session";

export const dynamic = "force-dynamic";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getStockDocument(id);
  if (!document || document.type !== "ISSUE") notFound();

  return <StockDocumentSession document={document} backHref="/stock/issue" />;
}
