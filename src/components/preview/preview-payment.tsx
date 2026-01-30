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
    <div className="mb-6">
      {/* Payment Terms */}
      {hasPaymentTerms && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-bold text-gray-800">
            เงื่อนไขการชำระเงิน
          </h3>
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-1.5 sm:px-3 py-1.5 text-center w-10 sm:w-16">
                  งวดที่
                </th>
                <th className="border border-gray-200 px-1.5 sm:px-3 py-1.5 text-left">
                  รายละเอียด
                </th>
                <th className="border border-gray-200 px-1.5 sm:px-3 py-1.5 text-right w-20 sm:w-32">
                  จำนวนเงิน (บาท)
                </th>
              </tr>
            </thead>
            <tbody>
              {paymentTerms.map((term) => (
                <tr key={term.sequence}>
                  <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 text-center text-gray-600">
                    {term.sequence}
                  </td>
                  <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 text-gray-700">
                    <div>{term.name}</div>
                    {term.type === "PERCENTAGE" && (
                      <span className="text-xs text-gray-400">
                        ({formatNumber(term.value)}%)
                      </span>
                    )}
                    {term.note && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {term.note}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 px-1.5 sm:px-3 py-1.5 text-right font-medium text-gray-900">
                    {formatNumber(term.calculatedAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bank Account Info */}
      {hasBankInfo && (
        <div className="rounded border border-gray-200 bg-blue-50/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-bold text-gray-800">
              ข้อมูลบัญชีสำหรับโอนเงิน
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            {company.bankName && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-20 shrink-0">ธนาคาร:</span>
                <span className="font-medium text-gray-800">
                  {company.bankName}
                </span>
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
        </div>
      )}
    </div>
  );
}
