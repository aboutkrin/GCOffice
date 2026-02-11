"use client";

import { useRef } from "react";
import {
  ProductSummaryPreview,
  type ProductSummaryData,
} from "./product-summary-preview";
import { ProductSummaryToolbar } from "./product-summary-toolbar";

interface ProductSummaryPreviewPageProps {
  data: ProductSummaryData;
}

export function ProductSummaryPreviewPage({
  data,
}: ProductSummaryPreviewPageProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Preview Area */}
      <div className="py-6 px-4 print:p-0 print:py-0">
        <ProductSummaryPreview ref={previewRef} data={data} />
      </div>

      {/* Bottom spacer for fixed toolbar on mobile */}
      <div className="h-20 md:h-0 print:hidden" />

      {/* Export Toolbar */}
      <ProductSummaryToolbar
        previewRef={previewRef}
        filename={`สรุปรายการสินค้า${data.categoryName ? `-${data.categoryName}` : ""}`}
      />
    </div>
  );
}
