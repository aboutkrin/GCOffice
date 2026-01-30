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

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Preview Area */}
      <div className="py-6 px-4 print:p-0 print:py-0">
        <DocumentPreview ref={previewRef} document={document} />
      </div>

      {/* Bottom spacer for fixed toolbar on mobile */}
      <div className="h-20 md:h-0 print:hidden" />

      {/* Export Toolbar */}
      <ExportToolbar
        documentRef={previewRef}
        filename={document.documentNumber}
        documentId={document.id}
        currentStatus={document.status}
      />
    </div>
  );
}
