"use client";

import { formatNumber } from "@/lib/thai-currency";
import { Landmark } from "lucide-react";

interface PaymentTerm {
  sequence: number;
  name: string;
  type: "PERCENTAGE" | "AMOUNT";
  value: number;
  calculatedAmount: number;
  note?: string;
}

interface PreviewPaymentProps {
  paymentTerms: PaymentTerm[];
  company: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    bankLogoUrl?: string;
    promptpayQrUrl?: string;
  };
}

export function PreviewPayment({
  paymentTerms,
  company,
}: PreviewPaymentProps) {
  const hasPaymentTerms = paymentTerms.length > 0;
  const hasBankInfo =
    company.bankName || company.accountName || company.accountNumber;

  if (!hasPaymentTerms && !hasBankInfo) return null;

  return (
    <div className="mb-3">
      {/* Horizontal layout: Bank info (left) + Payment terms (right) */}
      {hasPaymentTerms && hasBankInfo ? (
        <div>
          <div className="flex items-stretch gap-3">
            {/* Left: Bank Account Info + QR Code */}
            <div className="shrink-0 rounded border border-gray-200 bg-blue-50/50 p-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Landmark className="h-3.5 w-3.5 text-blue-600" />
                <h4 className="text-[10px] font-bold text-gray-800">
                  ข้อมูลบัญชีสำหรับโอนเงิน
                </h4>
              </div>
              <div className="flex items-start gap-2">
                <div className="grid grid-cols-1 gap-0.5 text-[10px]">
                  {company.bankName && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-16 shrink-0">ธนาคาร:</span>
                      <div className="flex items-center gap-1.5">
                        {company.bankLogoUrl && (
                          <img
                            src={company.bankLogoUrl}
                            alt={company.bankName}
                            className="h-4 w-4 object-contain shrink-0"
                          />
                        )}
                        <span className="font-medium text-gray-800">
                          {company.bankName}
                        </span>
                      </div>
                    </div>
                  )}
                  {company.accountName && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-16 shrink-0">ชื่อบัญชี:</span>
                      <span className="font-medium text-gray-800">
                        {company.accountName}
                      </span>
                    </div>
                  )}
                  {company.accountNumber && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-16 shrink-0">เลขที่บัญชี:</span>
                      <span className="font-medium text-gray-800 tracking-wide">
                        {company.accountNumber}
                      </span>
                    </div>
                  )}
                </div>
                {company.promptpayQrUrl && (
                  <div className="flex flex-col items-center shrink-0">
                    <img
                      src={company.promptpayQrUrl}
                      alt="PromptPay QR Code"
                      className="h-16 w-16 object-contain"
                    />
                    <span className="text-[10px] text-gray-500 mt-1">พร้อมเพย์</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Payment Terms Table */}
            <div className="flex-1 min-w-0">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-1 sm:px-2 py-1 text-center w-10 sm:w-14">
                      งวดที่
                    </th>
                    <th className="border border-gray-200 px-1 sm:px-2 py-1 text-left">
                      เงื่อนไขการชำระเงิน
                    </th>
                    <th className="border border-gray-200 px-1 sm:px-2 py-1 text-right w-20 sm:w-28">
                      จำนวนเงิน (บาท)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTerms.map((term) => (
                    <tr key={term.sequence}>
                      <td className="border border-gray-200 px-1 sm:px-2 py-1 text-center text-gray-600">
                        {term.sequence}
                      </td>
                      <td className="border border-gray-200 px-1 sm:px-2 py-1 text-gray-700">
                        <div className="flex items-baseline justify-between gap-2">
                          <span>{term.name}</span>
                          {term.type === "PERCENTAGE" && (
                            <span className="text-[10px] text-gray-400 shrink-0">
                              ({formatNumber(term.value)}%)
                            </span>
                          )}
                        </div>
                        {term.note && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {term.note}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 px-1 sm:px-2 py-1 text-right font-medium text-gray-900">
                        {formatNumber(term.calculatedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Payment Terms only (no bank info) */}
          {hasPaymentTerms && (
            <div className="mb-4">
              <h3 className="mb-2 text-[10px] font-bold text-gray-800">
                เงื่อนไขการชำระเงิน
              </h3>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-1 sm:px-2 py-1 text-center w-10 sm:w-16">
                      งวดที่
                    </th>
                    <th className="border border-gray-200 px-1 sm:px-2 py-1 text-left">
                      เงื่อนไขการชำระเงิน
                    </th>
                    <th className="border border-gray-200 px-1 sm:px-2 py-1 text-right w-20 sm:w-32">
                      จำนวนเงิน (บาท)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTerms.map((term) => (
                    <tr key={term.sequence}>
                      <td className="border border-gray-200 px-1 sm:px-2 py-1 text-center text-gray-600">
                        {term.sequence}
                      </td>
                      <td className="border border-gray-200 px-1 sm:px-2 py-1 text-gray-700">
                        <div className="flex items-baseline justify-between gap-2">
                          <span>{term.name}</span>
                          {term.type === "PERCENTAGE" && (
                            <span className="text-[10px] text-gray-400 shrink-0">
                              ({formatNumber(term.value)}%)
                            </span>
                          )}
                        </div>
                        {term.note && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {term.note}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 px-1 sm:px-2 py-1 text-right font-medium text-gray-900">
                        {formatNumber(term.calculatedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bank Account Info only (no payment terms) */}
          {hasBankInfo && (
            <div className="rounded border border-gray-200 bg-blue-50/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="h-4 w-4 text-blue-600" />
                <h4 className="text-[10px] font-bold text-gray-800">
                  ข้อมูลบัญชีสำหรับโอนเงิน
                </h4>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="grid grid-cols-1 gap-1 text-[10px]">
                  {company.bankName && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20 shrink-0">ธนาคาร:</span>
                      <div className="flex items-center gap-1.5">
                        {company.bankLogoUrl && (
                          <img
                            src={company.bankLogoUrl}
                            alt={company.bankName}
                            className="h-5 w-5 object-contain shrink-0"
                          />
                        )}
                        <span className="font-medium text-gray-800">
                          {company.bankName}
                        </span>
                      </div>
                    </div>
                  )}
                  {company.accountName && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-20 shrink-0">ชื่อบัญชี:</span>
                      <span className="font-medium text-gray-800">
                        {company.accountName}
                      </span>
                    </div>
                  )}
                  {company.accountNumber && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-20 shrink-0">เลขที่บัญชี:</span>
                      <span className="font-medium text-gray-800 tracking-wide">
                        {company.accountNumber}
                      </span>
                    </div>
                  )}
                </div>
                {company.promptpayQrUrl && (
                  <div className="flex flex-col items-center shrink-0">
                    <img
                      src={company.promptpayQrUrl}
                      alt="PromptPay QR Code"
                      className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
                    />
                    <span className="text-[10px] text-gray-500 mt-1">พร้อมเพย์</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
