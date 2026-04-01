"use client";

import { useRef } from "react";
import {
  ExpenseSummaryPreview,
  type ExpenseSummaryData,
} from "./expense-summary-preview";
import { SummaryExportToolbar } from "@/components/preview/summary-export-toolbar";

interface ExpenseSummaryPageProps {
  data: ExpenseSummaryData;
  filename: string;
  backHref: string;
}

export function ExpenseSummaryPage({
  data,
  filename,
  backHref,
}: ExpenseSummaryPageProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="py-6 px-4 print:p-0 print:py-0">
        <ExpenseSummaryPreview ref={previewRef} data={data} />
      </div>

      <div className="h-36 md:h-0 print:hidden" />

      <SummaryExportToolbar
        previewRef={previewRef}
        filename={filename}
        backHref={backHref}
      />
    </div>
  );
}
