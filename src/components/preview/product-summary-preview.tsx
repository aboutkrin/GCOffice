"use client";

import { forwardRef } from "react";
import { PreviewHeader } from "./preview-header";
import { formatNumber } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";

interface CompanySnapshot {
  name: string;
  address: string;
  taxId?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  lineOa?: string;
  tiktok?: string;
  logoUrl?: string;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  imageUrl?: string | null;
  basePrice: number;
  category?: { name: string } | null;
}

export interface ProductSummaryData {
  company: CompanySnapshot;
  products: ProductItem[];
  categoryName?: string;
}

interface ProductSummaryPreviewProps {
  data: ProductSummaryData;
}

export const ProductSummaryPreview = forwardRef<
  HTMLDivElement,
  ProductSummaryPreviewProps
>(function ProductSummaryPreview({ data }, ref) {
  return (
    <div
      id="product-summary-preview"
      ref={ref}
      className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-4 sm:p-6 shadow-lg flex flex-col print:shadow-none print:p-0 print:w-[210mm] print:max-w-none print:min-h-[297mm]"
    >
      {/* Header: Company Info */}
      <PreviewHeader
        company={data.company}
        documentType="PRODUCT_SUMMARY"
        vatEnabled={false}
      />

      {/* Date */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-gray-500">
          {data.categoryName && (
            <span>หมวดหมู่: {data.categoryName}</span>
          )}
        </div>
        <div className="text-[10px] text-gray-500">
          วันที่: {formatThaiDate(new Date())}
        </div>
      </div>

      {/* Product Table */}
      <div className="mb-3">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-7 sm:w-10">
                #
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-10 sm:w-14">
                รูป
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-left w-20 sm:w-28">
                รหัส
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-left">
                ชื่อสินค้า
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-left w-20 sm:w-28">
                หมวดหมู่
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-right w-16 sm:w-28">
                ราคา (฿)
              </th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((product, index) => (
              <tr
                key={product.id}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-600">
                  {index + 1}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center">
                  {product.imageUrl ? (
                    <div className="relative h-8 w-8 sm:h-10 sm:w-10 mx-auto shrink-0 overflow-hidden rounded border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 sm:h-10 sm:w-10 mx-auto rounded bg-gray-100 flex items-center justify-center text-gray-400 text-[8px]">
                      N/A
                    </div>
                  )}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-gray-600 break-all">
                  {product.sku}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 font-medium text-gray-900 break-words">
                  {product.name}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-gray-600">
                  {product.category?.name ?? "-"}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-right text-gray-700">
                  {formatNumber(product.basePrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Footer: Total items */}
      <div className="border-t border-gray-200 pt-2 mt-2">
        <div className="flex justify-end">
          <div className="text-[10px] text-gray-600">
            จำนวนสินค้าทั้งหมด:{" "}
            <span className="font-semibold text-gray-900">
              {data.products.length}
            </span>{" "}
            รายการ
          </div>
        </div>
      </div>
    </div>
  );
});
