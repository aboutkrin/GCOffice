import { getDocumentById } from "@/data/documents";
import { notFound } from "next/navigation";
import { DocumentPreviewPage } from "@/components/preview/document-preview-page";

export const dynamic = 'force-dynamic';

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document || document.type !== "INVOICE") {
    notFound();
  }

  return <DocumentPreviewPage document={document as any} />;
}
