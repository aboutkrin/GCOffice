"use client";

import { formatNumber } from "@/lib/thai-currency";
import { bahtText } from "@/lib/thai-number";

interface DepositDeduction {
  sequence: number;
  label: string;
  taxInvoiceNumber?: string | null;
  amount: number;
}

interface PreviewSummaryProps {
  subtotal: number;
  discountType?: "PERCENTAGE" | "AMOUNT";
  discountValue?: number;
  discountAmount: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmount: number;
  shippingCost?: number;
  shippingLocation?: string | null;
  freeShipping?: boolean;
  freeShippingLocation?: string | null;
  pickupAtShowroom?: boolean;
  grandTotal: number;
  depositDeductions?: DepositDeduction[];
  netPayable?: number;
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
  shippingLocation,
  freeShipping = false,
  freeShippingLocation,
  pickupAtShowroom = false,
  grandTotal,
  depositDeductions = [],
  netPayable,
}: PreviewSummaryProps) {
  const hasDiscount = Number(discountAmount) > 0;
  const hasDeductions = depositDeductions.length > 0;
  const resolvedNetPayable = netPayable ?? grandTotal;
  const subtotalWithShipping = Number(subtotal) + Number(shippingCost);
  const afterDiscount = subtotalWithShipping - Number(discountAmount);

  const discountLabel =
    discountType === "PERCENTAGE" && discountValue
      ? `ส่วนลด (${formatNumber(discountValue)}%)`
      : "ส่วนลด";

  return (
    <div className="mb-3">
      {/* Upper summary rows — right-aligned, width matches payment terms table below */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm">
          <table className="w-full text-[10px]">
            <tbody>
              {/* Subtotal */}
              <tr>
                <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                  รวมเป็นเงิน
                </td>
                <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                  {formatNumber(subtotal)}
                </td>
              </tr>

              {/* Shipping */}
              {(shippingCost > 0 || freeShipping) && (
                <tr>
                  <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                    ค่าจัดส่ง
                  </td>
                  <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                    {formatNumber(freeShipping ? 0 : shippingCost)}
                  </td>
                </tr>
              )}

              {/* Discount */}
              {hasDiscount && (
                <>
                  <tr>
                    <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                      {discountLabel}
                    </td>
                    <td className="py-0.5 sm:py-1 text-right font-medium text-red-600 w-24 sm:w-32">
                      -{formatNumber(discountAmount)}
                    </td>
                  </tr>
                  <tr>
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
                  <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                    ภาษีมูลค่าเพิ่ม {vatRate}%
                  </td>
                  <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                    {formatNumber(vatAmount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grand Total row — bahtText box (left) + total box (right),
          column widths mirror the payment section below */}
      <div className="mt-1 flex items-stretch gap-3">
        {/* Left: baht text — width matches "ข้อมูลบัญชีสำหรับการชำระ" box below */}
        <div className="flex-1 min-w-0 flex">
          <div className="w-full flex items-center justify-center rounded border border-blue-200 bg-blue-50/50 px-2 py-1.5 text-center text-[10px] font-medium text-gray-700">
            ({bahtText(hasDeductions ? resolvedNetPayable : grandTotal)})
          </div>
        </div>

        {/* Right: grand total — width matches the payment terms table below */}
        <div className="w-full max-w-sm shrink-0 border-t-2 border-blue-200 bg-blue-100 py-1.5">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="pr-2 sm:pr-4 text-right text-[14px] font-bold text-gray-900 whitespace-nowrap">
                  รวมทั้งสิ้น
                </td>
                <td className="text-right text-[14px] font-bold text-primary w-24 sm:w-32 px-1 sm:px-2">
                  {formatNumber(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit deduction rows + net payable — shown only when a deposit was already invoiced */}
      {hasDeductions && (
        <>
          <div className="mt-1 flex justify-end">
            <div className="w-full max-w-sm">
              <table className="w-full text-[10px]">
                <tbody>
                  {depositDeductions.map((d) => (
                    <tr key={d.sequence}>
                      <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                        หัก {d.label}
                        {d.taxInvoiceNumber ? ` (${d.taxInvoiceNumber})` : ""}
                      </td>
                      <td className="py-0.5 sm:py-1 text-right font-medium text-red-600 w-24 sm:w-32">
                        -{formatNumber(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-1 flex items-stretch gap-3">
            <div className="flex-1 min-w-0" />
            <div className="w-full max-w-sm shrink-0 border-t-2 border-blue-200 bg-blue-100 py-1.5">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="pr-2 sm:pr-4 text-right text-[14px] font-bold text-gray-900 whitespace-nowrap">
                      ยอดคงเหลือที่ต้องชำระ
                    </td>
                    <td className="text-right text-[14px] font-bold text-primary w-24 sm:w-32 px-1 sm:px-2">
                      {formatNumber(resolvedNetPayable)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Shipping location note */}
      {!pickupAtShowroom && !freeShipping && shippingCost > 0 && shippingLocation?.trim() && (
        <div className="mt-1.5 text-right text-[11px] font-semibold text-red-600">
          * จัดส่งไปที่ {shippingLocation.trim()} *
        </div>
      )}

      {/* Free shipping note */}
      {!pickupAtShowroom && freeShipping && (
        <div className="mt-1.5 text-right text-[11px] font-semibold text-red-600">
          * จัดส่งฟรี
          {freeShippingLocation?.trim() ? `ที่ ${freeShippingLocation.trim()}` : ""} *
        </div>
      )}

      {/* Pickup at showroom note */}
      {pickupAtShowroom && (
        <div className="mt-1.5 text-right text-[11px] font-semibold text-red-600">
          * รับสินค้าที่โชว์รูม *
        </div>
      )}
    </div>
  );
}
