"use client";

import { formatThaiDate } from "@/lib/thai-date";

interface PreviewFooterProps {
  footerNotes?: string;
  productionDays?: string;
  deliveryDateStart?: Date;
  deliveryDateEnd?: Date;
  documentDate?: Date;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    signatureUrl?: string | null;
  };
}

export function PreviewFooter({
  footerNotes,
  productionDays,
  deliveryDateStart,
  deliveryDateEnd,
  documentDate,
  createdBy,
}: PreviewFooterProps) {
  const hasDeliveryInfo = productionDays || deliveryDateStart || deliveryDateEnd;

  return (
    <div>
      {/* Delivery Info (left) + Signatures (right) */}
      <div className="flex items-start gap-4 sm:gap-6">
        {/* Left: Delivery Info Box */}
        {hasDeliveryInfo && (
          <div className="flex-1 min-w-0 rounded border border-gray-200 p-3 space-y-1">
            {productionDays && (
              <div className="text-[12px] leading-4 text-gray-700">
                <span className="font-bold">ระยะเวลาผลิต/จัดส่ง:</span>{" "}
                {productionDays}
              </div>
            )}

            {(deliveryDateStart || deliveryDateEnd) && (
              <div className="text-[12px] leading-4 text-gray-700">
                <span className="font-bold">
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

        {/* Right: Signature Lines */}
        <div className={`grid grid-cols-2 gap-4 sm:gap-6 ${hasDeliveryInfo ? "flex-1" : "w-full"}`}>
          {/* Left: Issuer */}
          <div className="text-center">
            <div className="flex items-end justify-center h-12 sm:h-16">
              {createdBy?.signatureUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={createdBy.signatureUrl}
                  alt="ลายเซ็น"
                  className="max-h-12 sm:max-h-16 w-auto object-contain"
                />
              )}
            </div>
            <div className="mx-auto w-24 sm:w-40 border-b border-gray-400" />
            {createdBy?.firstName || createdBy?.lastName ? (
              <p className="mt-1.5 text-[12px] leading-4 text-gray-700">
                {[createdBy.firstName, createdBy.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            ) : null}
            <p className="mt-1 text-[12px] leading-4 text-gray-700">
              ผู้เสนอราคา / ผู้ออกเอกสาร
            </p>
            <p className="mt-1 text-xs text-gray-500">
              วันที่{" "}
              {documentDate
                ? formatThaiDate(new Date(documentDate))
                : "____/____/________"}
            </p>
          </div>

          {/* Right: Approver */}
          <div className="text-center">
            <div className="h-12 sm:h-16" />
            <div className="mx-auto w-24 sm:w-40 border-b border-gray-400" />
            <p className="mt-1.5 text-[12px] leading-4 text-gray-700">
              ผู้อนุมัติ / ลูกค้า
            </p>
            <p className="mt-1 text-xs text-gray-500">
              วันที่ ____/____/________
            </p>
          </div>
        </div>
      </div>

      {/* Notes (below) */}
      {footerNotes && (
        <div className="mt-3">
          <h4 className="text-xs font-bold text-gray-800 mb-0.5 underline">
            หมายเหตุ
          </h4>
          <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
            {footerNotes}
          </p>
        </div>
      )}
    </div>
  );
}
