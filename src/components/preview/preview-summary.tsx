"use client";

import { formatNumber } from "@/lib/thai-currency";
import { bahtText } from "@/lib/thai-number";

interface PreviewSummaryProps {
  subtotal: number;
  discountType?: "PERCENTAGE" | "AMOUNT";
  discountValue?: number;
  discountAmount: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmount: number;
  shippingCost?: number;
  freeShipping?: boolean;
  freeShippingLocation?: string | null;
  grandTotal: number;
}

export function PreviewSummary({
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  vatEnabled,
  vatRate,
  vatAmount,
  shippingCost = 0,
  freeShipping = false,
  freeShippingLocation,
  grandTotal,
}: PreviewSummaryProps) {
  const hasDiscount = Number(discountAmount) > 0;
  const subtotalWithShipping = Number(subtotal) + Number(shippingCost);
  const afterDiscount = subtotalWithShipping - Number(discountAmount);

  const discountLabel =
    discountType === "PERCENTAGE" && discountValue
      ? `ส่วนลด (${formatNumber(discountValue)}%)`
      : "ส่วนลด";

  return (
    <div className="mb-3 flex justify-end">
      <div className="w-full max-w-lg">
        <table className="w-full text-[10px]">
          <tbody>
            {/* Subtotal */}
            <tr>
              <td />
              <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                รวมเป็นเงิน
              </td>
              <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                {formatNumber(subtotal)}
              </td>
            </tr>

            {/* Shipping */}
            {shippingCost > 0 && (
              <tr>
                <td />
                <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                  ค่าจัดส่ง
                </td>
                <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                  {formatNumber(shippingCost)}
                </td>
              </tr>
            )}

            {/* Discount */}
            {hasDiscount && (
              <>
                <tr>
                  <td />
                  <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                    {discountLabel}
                  </td>
                  <td className="py-0.5 sm:py-1 text-right font-medium text-red-600 w-24 sm:w-32">
                    -{formatNumber(discountAmount)}
                  </td>
                </tr>
                <tr>
                  <td />
                  <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                    ราคาหลังหักส่วนลด
                  </td>
                  <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                    {formatNumber(afterDiscount)}
                  </td>
                </tr>
              </>
            )}

            {/* VAT */}
            {vatEnabled && (
              <tr>
                <td />
                <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                  ภาษีมูลค่าเพิ่ม {vatRate}%
                </td>
                <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                  {formatNumber(vatAmount)}
                </td>
              </tr>
            )}

            {/* Grand Total */}
            <tr className="border-t-2 border-blue-200 bg-blue-100">
              <td className="py-1 pl-2 align-middle">
                <div className="rounded border border-blue-200 bg-blue-50/50 px-2 py-1 text-[10px] font-medium text-gray-700">
                  ({bahtText(grandTotal)})
                </div>
              </td>
              <td className="pt-2 pb-1 pr-2 sm:pr-4 text-right text-[14px] font-bold text-gray-900 whitespace-nowrap">
                รวมทั้งสิ้น
              </td>
              <td className="pt-2 pb-1 text-right text-[14px] font-bold text-primary w-24 sm:w-32">
                {formatNumber(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Free shipping note */}
        {freeShipping && (
          <div className="mt-1.5 text-right text-[11px] font-semibold text-red-600">
            * จัดส่งฟรี
            {freeShippingLocation?.trim() ? `ที่ ${freeShippingLocation.trim()}` : ""} *
          </div>
        )}
      </div>
    </div>
  );
}
