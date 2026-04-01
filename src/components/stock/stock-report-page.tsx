"use client";

import { useRef } from "react";
import { StockReportPreview } from "./stock-report-preview";
import { SummaryExportToolbar } from "@/components/preview/summary-export-toolbar";

interface StockReportPageProps {
  company: {
    name: string;
    logoUrl?: string | null;
    address: string;
    phone?: string | null;
    taxId?: string | null;
    email?: string | null;
    lineOa?: string | null;
    tiktok?: string | null;
    instagram?: string | null;
    facebook?: string | null;
  } | null;
  products: {
    id: string;
    sku: string;
    name: string;
    imageUrl?: string | null;
    stockQuantity: number;
    category?: { id: string; name: string } | null;
    colorVariants: {
      id: string;
      name: string;
      colorHex?: string | null;
      imageUrl?: string | null;
      stockQuantity: number;
    }[];
  }[];
}

export function StockReportPage({ company, products }: StockReportPageProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="py-6 px-4 print:p-0 print:py-0">
        <StockReportPreview
          ref={previewRef}
          company={company}
          products={products}
        />
      </div>

      {/* Bottom spacer for fixed toolbar + mobile nav */}
      <div className="h-36 md:h-0 print:hidden" />

      <SummaryExportToolbar
        previewRef={previewRef}
        filename="รายงานสต็อคสินค้า"
        backHref="/stock"
      />
    </div>
  );
}
