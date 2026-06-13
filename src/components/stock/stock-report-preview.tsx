"use client";

import { forwardRef } from "react";
import { formatThaiDateTime } from "@/lib/thai-date";
import {
  Package,
  Phone,
  Mail,
  MessageCircle,
  Facebook,
  Instagram,
  MapPin,
} from "lucide-react";

interface StockProduct {
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
}

interface Company {
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
}

interface StockReportPreviewProps {
  company: Company | null;
  products: StockProduct[];
}

export const StockReportPreview = forwardRef<
  HTMLDivElement,
  StockReportPreviewProps
>(function StockReportPreview({ company, products }, ref) {
  const now = new Date();

  // Group products by category
  const grouped = products.reduce<
    Record<string, { categoryName: string; items: StockProduct[] }>
  >((acc, product) => {
    const catName = product.category?.name ?? "ไม่มีหมวดหมู่";
    const catId = product.category?.id ?? "_none";
    if (!acc[catId]) {
      acc[catId] = { categoryName: catName, items: [] };
    }
    acc[catId].items.push(product);
    return acc;
  }, {});

  const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0);

  let rowIndex = 0;

  return (
    <div
      ref={ref}
      id="document-preview"
      className="mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-8 shadow-lg print:shadow-none print:p-6"
    >
      {/* Header - Goodchoice Letterhead */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            {company?.logoUrl && (
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
              {company?.name ?? "Goodchoice"}
            </h1>
          </div>
          <div className="text-right shrink-0">
            <h2 className="text-lg sm:text-2xl font-bold text-primary">
              รายงานสต็อคสินค้า
            </h2>
            <p className="text-xs text-gray-500">
              วันที่พิมพ์: {formatThaiDateTime(now)}
            </p>
          </div>
        </div>

        {/* Company address & contact info */}
        <div className="grid grid-cols-1 gap-0.5 text-[8px] text-gray-600">
          {company?.address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{company.address}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {company?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{company.phone}</span>
              </div>
            )}
            {company?.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span>{company.email}</span>
              </div>
            )}
            {company?.lineOa && (
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-3 w-3 shrink-0" />
                <span>LINE: {company.lineOa}</span>
              </div>
            )}
            {company?.tiktok && (
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-3 w-3 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.06a8.16 8.16 0 0 0 3.85.92V6.69Z" />
                </svg>
                <span>{company.tiktok}</span>
              </div>
            )}
            {company?.instagram && (
              <div className="flex items-center gap-1.5">
                <Instagram className="h-3 w-3 shrink-0" />
                <span>{company.instagram}</span>
              </div>
            )}
            {company?.facebook && (
              <div className="flex items-center gap-1.5">
                <Facebook className="h-3 w-3 shrink-0" />
                <span>{company.facebook}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Table by Category */}
      {Object.entries(grouped).map(([catId, { categoryName, items }]) => (
        <div key={catId} className="mb-4">
          <div className="mb-1 rounded bg-gray-100 px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-700">
              {categoryName} ({items.length} รายการ)
            </h3>
          </div>
          <table className="w-full table-fixed text-[10px]">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[40%]" />
              <col className="w-[40%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-1 pr-1 text-center">#</th>
                <th className="py-1 pr-1">ชื่อสินค้า</th>
                <th className="py-1 pr-1">รหัสสี</th>
                <th className="py-1 text-right">คงเหลือ (กล่อง)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => {
                rowIndex++;
                const hasVariants = product.colorVariants.length > 0;
                const activeVariants = product.colorVariants.filter(
                  (v) => v.stockQuantity > 0
                );
                const variantCount = activeVariants.length;
                const showVariants = hasVariants && variantCount > 0;

                if (!showVariants) {
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="py-1.5 pr-1 text-center text-gray-400">
                        {rowIndex}
                      </td>
                      <td className="py-1.5 pr-1">
                        <div className="flex items-start gap-2">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-8 w-8 shrink-0 rounded object-cover mt-0.5"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 mt-0.5">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-800">
                              {product.name}
                            </span>
                            <span className="block font-mono text-[9px] text-gray-400">
                              {product.sku}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 pr-1">
                        <span className="text-[9px] text-gray-400">-</span>
                      </td>
                      <td className="py-1.5 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {product.stockQuantity.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                }

                return activeVariants.map((variant, vIdx) => (
                  <tr
                    key={variant.id}
                    className={`align-middle ${vIdx < variantCount - 1 ? "border-b border-gray-200" : "border-b border-gray-100"}`}
                  >
                    {vIdx === 0 && (
                      <>
                        <td
                          className="py-1.5 pr-1 text-center text-gray-400 align-top"
                          rowSpan={variantCount}
                        >
                          {rowIndex}
                        </td>
                        <td
                          className="py-1.5 pr-1 align-top"
                          rowSpan={variantCount}
                        >
                          <div className="flex items-start gap-2">
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-8 w-8 shrink-0 rounded object-cover mt-0.5"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 mt-0.5">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-800">
                                {product.name}
                              </span>
                              <span className="block font-mono text-[9px] text-gray-400">
                                {product.sku}
                              </span>
                            </div>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="py-1.5 pr-1">
                      <div className="flex items-center gap-2 min-h-[2rem]">
                        {variant.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={variant.imageUrl}
                            alt={variant.name}
                            className="h-8 w-8 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100">
                            <Package className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                        {variant.colorHex && (
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-gray-300"
                            style={{
                              backgroundColor: variant.colorHex,
                            }}
                          />
                        )}
                        <span className="text-[10px] text-gray-600">
                          {variant.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {variant.stockQuantity.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Footer Summary */}
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-gray-500">
        <span>
          ทั้งหมด {products.length.toLocaleString()} รายการ | สต็อครวม{" "}
          {totalStock.toLocaleString()}
        </span>
        <span>พิมพ์จากระบบ Goodchoice</span>
      </div>
    </div>
  );
});
