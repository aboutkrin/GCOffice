"use client";

import { useRef } from "react";
import { DocumentPreview } from "./document-preview";
import { ExportToolbar } from "./export-toolbar";
import type { DocumentData } from "./document-preview";

interface DocumentPreviewPageProps {
  document: DocumentData;
}

export function DocumentPreviewPage({ document }: DocumentPreviewPageProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const isReceipt = document.type === "RECEIPT";
  // A deposit invoice is a tax invoice too — print ต้นฉบับ + สำเนา like a VAT receipt.
  const isTaxInvoice = (isReceipt && document.vatEnabled) || !!document.isDepositInvoice;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Preview Area */}
      <div ref={previewRef} className="py-6 px-4 print:p-0 print:py-0">
        {isTaxInvoice ? (
          <>
            <DocumentPreview document={document} copyLabel="ต้นฉบับ" />
            <div className="h-6 print:hidden" style={{ breakAfter: "page" }} />
            <DocumentPreview document={document} copyLabel="สำเนา" />
          </>
        ) : isReceipt ? (
          <DocumentPreview document={document} copyLabel="ต้นฉบับ" />
        ) : (
          <DocumentPreview document={document} />
        )}
      </div>

      {/* Bottom spacer for fixed toolbar + mobile nav */}
      <div className="h-36 md:h-0 print:hidden" />

      {/* Export Toolbar */}
      <ExportToolbar
        documentRef={previewRef}
        filename={document.documentNumber ?? "ร่าง"}
        documentId={document.id}
        currentStatus={document.status}
        documentType={document.type}
      />
    </div>
  );
}
