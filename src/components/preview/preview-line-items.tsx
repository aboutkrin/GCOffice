"use client";

import { formatNumber } from "@/lib/thai-currency";

interface LineItem {
  sequence: number;
  productSku?: string;
  productName: string;
  productImage?: string;
  showImage: boolean;
  details?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PreviewLineItemsProps {
  items: LineItem[];
}

export function PreviewLineItems({ items }: PreviewLineItemsProps) {
  return (
    <div className="mb-6">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-700 px-1.5 sm:px-3 py-1.5 sm:py-2 text-center w-7 sm:w-12">
              ลำดับ
            </th>
            <th className="border border-gray-700 px-1.5 sm:px-3 py-1.5 sm:py-2 text-left">
              รายการ
            </th>
            <th className="border border-gray-700 px-1.5 sm:px-3 py-1.5 sm:py-2 text-center w-10 sm:w-20">
              จำนวน
            </th>
            <th className="border border-gray-700 px-1.5 sm:px-3 py-1.5 sm:py-2 text-right w-16 sm:w-28">
              ราคา/หน่วย
            </th>
            <th className="border border-gray-700 px-1.5 sm:px-3 py-1.5 sm:py-2 text-right w-16 sm:w-28">
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
              <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 sm:py-2 text-center text-gray-600">
                {item.sequence}
              </td>

              {/* Product Name + Image + Details */}
              <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 sm:py-2">
                <div className="flex items-start gap-2 sm:gap-3">
                  {item.productImage && (
                    <div className="relative h-10 w-10 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded border border-gray-200">
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
                    {item.productSku && (
                      <div className="text-xs text-gray-400 break-all">
                        SKU: {item.productSku}
                      </div>
                    )}
                    {item.details && (
                      <div className="mt-0.5 text-xs text-gray-500 whitespace-pre-line break-words">
                        {item.details}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Quantity */}
              <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 sm:py-2 text-center text-gray-700">
                {formatNumber(item.quantity)}
              </td>

              {/* Unit Price */}
              <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 sm:py-2 text-right text-gray-700">
                {formatNumber(item.unitPrice)}
              </td>

              {/* Line Total */}
              <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 sm:py-2 text-right font-medium text-gray-900">
                {formatNumber(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
