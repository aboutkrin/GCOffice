"use client";

import { formatThaiDate } from "@/lib/thai-date";

interface PreviewFooterProps {
  footerNotes?: string;
  documentDate?: Date;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    signatureUrl?: string | null;
  };
}

export function PreviewFooter({
  footerNotes,
  documentDate,
  createdBy,
}: PreviewFooterProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
      {/* Left: Notes */}
      <div className="flex items-end">
        {footerNotes && (
          <div className="border border-gray-300 rounded p-2 sm:p-3 w-full">
            <p className="text-[10px] text-gray-600 whitespace-pre-line leading-relaxed">
              <span className="font-bold text-gray-800 underline">
                หมายเหตุ
              </span>
              <span className="font-bold text-gray-800">:</span> {footerNotes}
            </p>
          </div>
        )}
      </div>

      {/* Right: Signatures */}
      <div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Issuer */}
          <div className="text-center">
            <div className="flex items-end justify-center h-8 sm:h-12">
              {createdBy?.signatureUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={createdBy.signatureUrl}
                  alt="ลายเซ็น"
                  className="max-h-8 sm:max-h-12 w-auto object-contain"
                />
              )}
            </div>
            <div className="mx-auto w-24 sm:w-40 border-b border-blue-200" />
            {createdBy?.firstName || createdBy?.lastName ? (
              <p className="mt-1.5 text-[10px] text-gray-700">
                {[createdBy.firstName, createdBy.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            ) : null}
            <p className="mt-1 text-[10px] text-gray-700">
              ผู้เสนอราคา / ผู้ออกเอกสาร
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              วันที่{" "}
              {documentDate
                ? formatThaiDate(new Date(documentDate))
                : "____/____/________"}
            </p>
          </div>

          {/* Approver */}
          <div className="text-center">
            <div className="h-8 sm:h-12" />
            <div className="mx-auto w-24 sm:w-40 border-b border-blue-200" />
            <p className="mt-1.5 text-[10px] text-gray-700">
              ผู้อนุมัติ / ลูกค้า
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              วันที่ ____/____/________
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
