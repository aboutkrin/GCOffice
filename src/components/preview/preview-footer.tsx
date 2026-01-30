"use client";

import { formatThaiDate } from "@/lib/thai-date";

interface PreviewFooterProps {
  footerNotes?: string;
  productionDays?: string;
  deliveryDateStart?: Date;
  deliveryDateEnd?: Date;
}

export function PreviewFooter({
  footerNotes,
  productionDays,
  deliveryDateStart,
  deliveryDateEnd,
}: PreviewFooterProps) {
  const hasNotes = footerNotes || productionDays || deliveryDateStart;

  return (
    <div>
      {/* Notes & Delivery Info */}
      {hasNotes && (
        <div className="mb-6 space-y-2">
          {footerNotes && (
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">
                หมายเหตุ
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {footerNotes}
              </p>
            </div>
          )}

          {productionDays && (
            <div className="text-sm text-gray-700">
              <span className="font-semibold">ระยะเวลาผลิต/จัดส่ง:</span>{" "}
              {productionDays}
            </div>
          )}

          {(deliveryDateStart || deliveryDateEnd) && (
            <div className="text-sm text-gray-700">
              <span className="font-semibold">
                วันที่คาดว่าจะได้รับสินค้า:
              </span>{" "}
              {deliveryDateStart &&
                formatThaiDate(new Date(deliveryDateStart))}
              {deliveryDateStart && deliveryDateEnd && " - "}
              {deliveryDateEnd &&
                formatThaiDate(new Date(deliveryDateEnd))}
            </div>
          )}
        </div>
      )}

      {/* Signature Lines */}
      <div className="mt-6 sm:mt-10 grid grid-cols-2 gap-4 sm:gap-8 pt-4">
        {/* Left: Issuer */}
        <div className="text-center">
          <div className="mb-10 sm:mb-16" />
          <div className="mx-auto w-28 sm:w-48 border-b border-gray-400" />
          <p className="mt-2 text-xs sm:text-sm text-gray-700">
            ผู้เสนอราคา / ผู้ออกเอกสาร
          </p>
          <p className="mt-1 text-xs text-gray-500">
            วันที่ ____/____/________
          </p>
        </div>

        {/* Right: Approver */}
        <div className="text-center">
          <div className="mb-10 sm:mb-16" />
          <div className="mx-auto w-28 sm:w-48 border-b border-gray-400" />
          <p className="mt-2 text-xs sm:text-sm text-gray-700">
            ผู้อนุมัติ / ลูกค้า
          </p>
          <p className="mt-1 text-xs text-gray-500">
            วันที่ ____/____/________
          </p>
        </div>
      </div>
    </div>
  );
}
