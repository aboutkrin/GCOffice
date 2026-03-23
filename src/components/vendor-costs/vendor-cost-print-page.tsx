"use client";

import { useRef } from "react";
import {
  VendorCostPrintPreview,
  type VendorCostPrintData,
} from "./vendor-cost-print-preview";
import { SummaryExportToolbar } from "@/components/preview/summary-export-toolbar";

interface VendorCostPrintPageProps {
  data: VendorCostPrintData;
  filename: string;
}

export function VendorCostPrintPage({
  data,
  filename,
}: VendorCostPrintPageProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="py-6 px-4 print:p-0 print:py-0">
        <VendorCostPrintPreview ref={previewRef} data={data} />
      </div>

      <div className="h-20 md:h-0 print:hidden" />

      <SummaryExportToolbar
        previewRef={previewRef}
        filename={filename}
        backHref="/vendor-costs"
      />
    </div>
  );
}
