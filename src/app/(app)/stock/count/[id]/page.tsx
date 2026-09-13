import { notFound } from "next/navigation";
import { getStockDocument, getStockCountVariance } from "@/data/stock-documents";
import { StockDocumentSession } from "@/components/stock/stock-document-session";

export const dynamic = "force-dynamic";

export default async function CountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getStockDocument(id);
  if (!document || document.type !== "COUNT") notFound();

  const varianceLines = document.lines.length > 0 ? await getStockCountVariance(id) : [];

  return <StockDocumentSession document={document} backHref="/stock/count" varianceLines={varianceLines} />;
}
