"use client";

import { forwardRef } from "react";
import { formatThaiDateTime } from "@/lib/thai-date";
import { Package } from "lucide-react";

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
  const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0);

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

  let rowIndex = 0;

  return (
    <div
      ref={ref}
      id="document-preview"
      className="mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-8 shadow-lg print:shadow-none print:p-6"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          {company?.logoUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {company?.name ?? "บริษัท"}
            </h1>
            {company?.phone && (
              <p className="text-xs text-gray-500">โทร. {company.phone}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-primary">
            รายงานสต็อคสินค้า
          </h2>
          <p className="text-xs text-gray-500">
            วันที่พิมพ์: {formatThaiDateTime(now)}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-blue-50/50 p-2.5 text-center">
          <p className="text-xs text-gray-500">จำนวนรายการ</p>
          <p className="text-lg font-bold text-blue-700">
            {products.length.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-green-50/50 p-2.5 text-center">
          <p className="text-xs text-gray-500">สต็อครวม</p>
          <p className="text-lg font-bold text-green-700">
            {totalStock.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-purple-50/50 p-2.5 text-center">
          <p className="text-xs text-gray-500">หมวดหมู่</p>
          <p className="text-lg font-bold text-purple-700">
            {Object.keys(grouped).length}
          </p>
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
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="w-6 py-1 pr-1 text-center">#</th>
                <th className="w-8 py-1 pr-1">รูป</th>
                <th className="py-1 pr-1">รหัส</th>
                <th className="py-1 pr-1">ชื่อสินค้า</th>
                <th className="w-16 py-1 text-right">คงเหลือ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => {
                rowIndex++;
                const hasVariants = product.colorVariants.length > 0;
                return (
                  <tr key={product.id} className="border-b border-gray-100">
                    <td className="py-1 pr-1 text-center text-gray-400">
                      {rowIndex}
                    </td>
                    <td className="py-1 pr-1">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-7 w-7 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-gray-100">
                          <Package className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-1 pr-1 font-mono text-gray-600">
                      {product.sku}
                    </td>
                    <td className="py-1 pr-1">
                      <span className="font-medium text-gray-800">
                        {product.name}
                      </span>
                      {/* Color Variants inline */}
                      {hasVariants && (
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {product.colorVariants
                            .filter((v) => v.stockQuantity > 0)
                            .map((variant) => (
                              <span
                                key={variant.id}
                                className="inline-flex items-center gap-1 text-[9px] text-gray-500"
                              >
                                {variant.colorHex && (
                                  <span
                                    className="inline-block h-2 w-2 rounded-full border border-gray-300"
                                    style={{
                                      backgroundColor: variant.colorHex,
                                    }}
                                  />
                                )}
                                {variant.name}: {variant.stockQuantity}
                              </span>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="py-1 text-right font-semibold text-gray-800">
                      {product.stockQuantity.toLocaleString()}
                    </td>
                  </tr>
                );
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
        <span>พิมพ์จากระบบ {company?.name ?? ""}</span>
      </div>
    </div>
  );
});
