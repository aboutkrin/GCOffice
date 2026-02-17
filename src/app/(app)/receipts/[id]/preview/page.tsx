import { getDocumentById } from "@/data/documents";
import { notFound } from "next/navigation";
import { DocumentPreviewPage } from "@/components/preview/document-preview-page";

export const dynamic = 'force-dynamic';

export default async function ReceiptPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document || document.type !== "RECEIPT") {
    notFound();
  }

  // Use live company data so updates reflect in all documents
  const documentWithLiveCompany = {
    ...document,
    companySnapshot: document.company
      ? {
          name: document.company.name,
          address: document.company.address,
          phone: document.company.phone,
          email: document.company.email,
          facebook: document.company.facebook,
          instagram: document.company.instagram,
          lineOa: document.company.lineOa,
          tiktok: document.company.tiktok,
          logoUrl: document.company.logoUrl,
          bankName: document.company.bankName,
          bankLogoUrl: document.company.bankLogoUrl,
          accountName: document.company.accountName,
          accountNumber: document.company.accountNumber,
          promptpayQrUrl: document.company.promptpayQrUrl,
          taxId: document.company.taxId,
        }
      : document.companySnapshot,
    createdBy: document.createdBy,
  };

  return <DocumentPreviewPage document={documentWithLiveCompany as any} />;
}
