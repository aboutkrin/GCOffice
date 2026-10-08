"use client";

import { useRef } from "react";
import { PayrollSlipPreview, type PayrollSlipData } from "./payroll-slip-preview";
import { SummaryExportToolbar } from "@/components/preview/summary-export-toolbar";

interface PayrollSlipPageProps {
  data: PayrollSlipData;
  filename: string;
  backHref: string;
}

export function PayrollSlipPage({ data, filename, backHref }: PayrollSlipPageProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="py-6 px-4 print:p-0 print:py-0">
        <PayrollSlipPreview ref={previewRef} data={data} />
      </div>

      <div className="h-36 md:h-0 print:hidden" />

      <SummaryExportToolbar previewRef={previewRef} filename={filename} backHref={backHref} />
    </div>
  );
}
