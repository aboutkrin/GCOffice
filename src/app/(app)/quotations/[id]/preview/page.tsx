import { getDocumentById } from "@/data/documents";
import { notFound } from "next/navigation";
import { DocumentPreviewPage } from "@/components/preview/document-preview-page";

export const dynamic = 'force-dynamic';

export default async function QuotationPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document || document.type !== "QUOTATION") {
    notFound();
  }

  // Use live company data so updates reflect in all documents
  // Pass the company object directly instead of manually picking fields
  // to ensure new fields (like instagram) are always included
  const documentWithLiveCompany = {
    ...document,
    companySnapshot: document.company ?? document.companySnapshot,
    createdBy: document.createdBy,
  };

  return <DocumentPreviewPage document={documentWithLiveCompany as any} />;
}
