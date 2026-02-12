"use client";

import { useRef } from "react";
import {
  VendorCostSummaryPreview,
  type VendorCostSummaryData,
} from "./vendor-cost-summary-preview";
import { SummaryExportToolbar } from "@/components/preview/summary-export-toolbar";

interface VendorCostSummaryPageProps {
  data: VendorCostSummaryData;
  filename: string;
  backHref: string;
}

export function VendorCostSummaryPage({
  data,
  filename,
  backHref,
}: VendorCostSummaryPageProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="py-6 px-4 print:p-0 print:py-0">
        <VendorCostSummaryPreview ref={previewRef} data={data} />
      </div>

      <div className="h-20 md:h-0 print:hidden" />

      <SummaryExportToolbar
        previewRef={previewRef}
        filename={filename}
        backHref={backHref}
      />
    </div>
  );
}
