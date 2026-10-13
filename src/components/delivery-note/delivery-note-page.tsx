"use client";

import { useRef } from "react";
import { SummaryExportToolbar } from "@/components/preview/summary-export-toolbar";
import type { DeliveryNoteData } from "@/data/delivery-notes";
import { DeliveryNotePreview } from "./delivery-note-preview";

export function DeliveryNotePage({ data }: { data: DeliveryNoteData }) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* ต้นฉบับ goes with the goods; the signed สำเนา comes back to the office. */}
      <div
        ref={previewRef}
        id="delivery-note-print"
        className="flex flex-col items-center gap-6 py-6 px-4 print:block print:p-0"
      >
        <DeliveryNotePreview data={data} copyLabel="ต้นฉบับ - ลูกค้า" />
        <div className="h-0 print:hidden" style={{ breakAfter: "page" }} />
        <DeliveryNotePreview data={data} copyLabel="สำเนา - เซ็นรับคืนบริษัท" />
      </div>

      <div className="h-36 md:h-0 print:hidden" />

      <SummaryExportToolbar
        previewRef={previewRef}
        filename={data.deliveryNumber ?? data.issueNumber}
        backHref={`/stock/issue/${data.id}`}
      />
    </div>
  );
}
