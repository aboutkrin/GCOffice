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
  grandTotal,
}: PreviewSummaryProps) {
  const hasDiscount = discountAmount > 0;
  const afterDiscount = subtotal - discountAmount;

  const discountLabel =
    discountType === "PERCENTAGE" && discountValue
      ? `ส่วนลด (${formatNumber(discountValue)}%)`
      : "ส่วนลด";

  return (
    <div className="mb-6 flex justify-end">
      <div className="w-full max-w-sm">
        <table className="w-full text-xs sm:text-sm">
          <tbody>
            {/* Subtotal */}
            <tr>
              <td className="py-1 sm:py-1.5 pr-2 sm:pr-4 text-right text-gray-600">
                รวมเป็นเงิน
              </td>
              <td className="py-1 sm:py-1.5 text-right font-medium text-gray-900 w-24 sm:w-32">
                {formatNumber(subtotal)}
              </td>
            </tr>

            {/* Discount */}
            {hasDiscount && (
              <>
                <tr>
                  <td className="py-1 sm:py-1.5 pr-2 sm:pr-4 text-right text-gray-600">
                    {discountLabel}
                  </td>
                  <td className="py-1 sm:py-1.5 text-right font-medium text-red-600 w-24 sm:w-32">
                    -{formatNumber(discountAmount)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 sm:py-1.5 pr-2 sm:pr-4 text-right text-gray-600">
                    ราคาหลังหักส่วนลด
                  </td>
                  <td className="py-1 sm:py-1.5 text-right font-medium text-gray-900 w-24 sm:w-32">
                    {formatNumber(afterDiscount)}
                  </td>
                </tr>
              </>
            )}

            {/* VAT */}
            {vatEnabled && (
              <tr>
                <td className="py-1 sm:py-1.5 pr-2 sm:pr-4 text-right text-gray-600">
                  ภาษีมูลค่าเพิ่ม {vatRate}%
                </td>
                <td className="py-1 sm:py-1.5 text-right font-medium text-gray-900 w-24 sm:w-32">
                  {formatNumber(vatAmount)}
                </td>
              </tr>
            )}

            {/* Grand Total */}
            <tr className="border-t-2 border-gray-800">
              <td className="pt-2 pb-1 pr-2 sm:pr-4 text-right text-sm sm:text-base font-bold text-gray-900">
                รวมทั้งสิ้น
              </td>
              <td className="pt-2 pb-1 text-right text-base sm:text-lg font-bold text-primary w-24 sm:w-32">
                {formatNumber(grandTotal)}
              </td>
            </tr>

            {/* Baht currency label */}
            <tr>
              <td className="pr-2 sm:pr-4 text-right text-gray-500 text-xs" />
              <td className="text-right text-xs text-gray-500">บาท</td>
            </tr>
          </tbody>
        </table>

        {/* Thai Baht Text */}
        <div className="mt-2 rounded bg-gray-50 px-3 py-2 text-center text-sm text-gray-700 border border-gray-200">
          <span className="font-medium">({bahtText(grandTotal)})</span>
        </div>
      </div>
    </div>
  );
}
