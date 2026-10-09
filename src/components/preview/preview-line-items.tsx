"use client";

import { formatNumber } from "@/lib/thai-currency";

interface LineItem {
  sequence: number;
  productSku?: string;
  productName: string;
  productImage?: string;
  colorVariantName?: string;
  colorVariantSku?: string;
  showImage: boolean;
  details?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Website tile fact: m² one box covers. */
  sqmPerUnit?: string | null;
  /** Website unit label (e.g. "กล่อง"). */
  unitLabel?: string | null;
}

const DEFAULT_UNIT = "กล่อง";

function unitOf(item: LineItem) {
  return item.unitLabel?.trim() || DEFAULT_UNIT;
}

/** "1.4400" → "1.44", "2.00" → "2"; null when missing or not positive. */
function formatSqm(value?: string | null) {
  const n = value ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatQuantity(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
}

interface PreviewLineItemsProps {
  items: LineItem[];
}

export function PreviewLineItems({ items }: PreviewLineItemsProps) {
  // "ราคา/กล่อง" when every line shares one unit; otherwise the generic
  // header and the unit printed after each quantity.
  const units = new Set(items.map(unitOf));
  const commonUnit = units.size === 1 ? [...units][0] : null;
  const priceHeader = commonUnit ? `ราคา/${commonUnit}` : "ราคา/หน่วย";

  return (
    <div className="mb-3">
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-7 sm:w-12">
              ลำดับ
            </th>
            <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-left">
              รายการ
            </th>
            <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-10 sm:w-20">
              จำนวน
            </th>
            <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-right w-16 sm:w-28">
              {priceHeader}
            </th>
            <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-right w-16 sm:w-28">
              รวม
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.sequence}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              {/* Sequence */}
              <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-600">
                {item.sequence}
              </td>

              {/* Product Name + Image + Details */}
              <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5">
                <div className="flex items-start gap-2 sm:gap-3">
                  {item.productImage && (
                    <div className="relative h-8 w-8 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 break-words">
                      {item.productName}
                    </div>
                    {(() => {
                      const sqm = formatSqm(item.sqmPerUnit);
                      if (!item.colorVariantName && !sqm) return null;
                      return (
                        <div className="text-[10px] font-normal text-gray-700 break-words">
                          {item.colorVariantName && (
                            <>
                              สี : {item.colorVariantName}
                              {item.colorVariantSku && <> (CODE : {item.colorVariantSku})</>}
                            </>
                          )}
                          {item.colorVariantName && sqm && " "}
                          {sqm && <>(1 {unitOf(item)} / {sqm} ตร.ม.)</>}
                        </div>
                      );
                    })()}
                    {item.details && (
                      <div className="mt-0.5 text-[10px] text-gray-500 whitespace-pre-line break-words">
                        {item.details}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Quantity */}
              <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-700 sm:whitespace-nowrap">
                <span className="font-medium text-gray-900">{formatQuantity(item.quantity)}</span>
                {!commonUnit && (
                  <>
                    {" "}
                    <span className="text-[9px] text-gray-500">{unitOf(item)}</span>
                  </>
                )}
              </td>

              {/* Unit Price */}
              <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-right text-gray-700">
                {formatNumber(item.unitPrice)}
              </td>

              {/* Line Total */}
              <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-right font-medium text-gray-900">
                {formatNumber(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
