"use client";

import { forwardRef } from "react";
import { formatNumber, formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { bahtText } from "@/lib/thai-number";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  notes?: string;
  category?: {
    name: string;
  };
}

interface CompanyData {
  name: string;
  address?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
}

export interface ExpenseSummaryData {
  expenses: ExpenseItem[];
  totalAmount: number;
  periodLabel: string;
  company?: CompanyData;
}

interface ExpenseSummaryPreviewProps {
  data: ExpenseSummaryData;
}

export const ExpenseSummaryPreview = forwardRef<
  HTMLDivElement,
  ExpenseSummaryPreviewProps
>(function ExpenseSummaryPreview({ data }, ref) {
  // Group expenses by category for summary
  const categoryTotals = data.expenses.reduce<
    Record<string, { name: string; total: number; count: number }>
  >((acc, expense) => {
    const catName = expense.category?.name ?? "ไม่ระบุหมวดหมู่";
    if (!acc[catName]) {
      acc[catName] = { name: catName, total: 0, count: 0 };
    }
    acc[catName].total += Number(expense.amount);
    acc[catName].count += 1;
    return acc;
  }, {});

  const sortedCategories = Object.values(categoryTotals).sort(
    (a, b) => b.total - a.total
  );

  return (
    <div
      id="summary-preview"
      ref={ref}
      className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-4 sm:p-6 shadow-lg flex flex-col print:shadow-none print:p-0 print:w-[210mm] print:max-w-none print:min-h-[297mm]"
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {data.company?.logoUrl && (
              <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.company.logoUrl}
                  alt={data.company.name}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
                {data.company?.name ?? ""}
              </h1>
            </div>
          </div>
          <div className="text-right shrink-0">
            <h2 className="text-lg sm:text-2xl font-bold text-primary">
              ใบสรุปค่าใช้จ่าย
            </h2>
          </div>
        </div>
        <div className="text-sm text-gray-600 text-right">
          {data.periodLabel}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-4">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-7 sm:w-10">
                ลำดับ
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-16 sm:w-24">
                วันที่
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-left">
                รายการ
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-16 sm:w-24">
                หมวดหมู่
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-14 sm:w-20">
                วิธีชำระ
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-right w-16 sm:w-28">
                จำนวนเงิน
              </th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.map((expense, index) => (
              <tr
                key={expense.id}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-600">
                  {index + 1}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-700">
                  {formatThaiDate(new Date(expense.expenseDate), "short")}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5">
                  <div className="font-medium text-gray-900">
                    {expense.name}
                  </div>
                  {expense.notes && (
                    <div className="text-[9px] text-gray-500 line-clamp-1">
                      {expense.notes}
                    </div>
                  )}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-700">
                  {expense.category?.name ?? "-"}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-700">
                  {PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? "-"}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-right font-medium text-gray-900">
                  {formatNumber(expense.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Category Summary */}
      {sortedCategories.length > 0 && (
        <div className="mb-3">
          <h3 className="text-[11px] font-bold text-gray-800 mb-1">
            สรุปตามหมวดหมู่
          </h3>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-1 text-left">
                  หมวดหมู่
                </th>
                <th className="border border-gray-200 px-2 py-1 text-center w-16">
                  จำนวน
                </th>
                <th className="border border-gray-200 px-2 py-1 text-right w-28">
                  ยอดรวม
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((cat) => (
                <tr key={cat.name}>
                  <td className="border border-gray-200 px-2 py-1 text-gray-700">
                    {cat.name}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-center text-gray-600">
                    {cat.count} รายการ
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-900">
                    {formatNumber(cat.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grand Total */}
      <div className="mb-3 flex justify-end">
        <div className="w-full max-w-sm">
          <table className="w-full text-[10px]">
            <tbody>
              <tr>
                <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                  รายการทั้งหมด
                </td>
                <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                  {data.expenses.length} รายการ
                </td>
              </tr>
              <tr className="border-t-2 border-gray-800 bg-gray-100">
                <td className="pt-2 pb-1 pr-2 sm:pr-4 text-right text-[14px] font-bold text-gray-900">
                  รวมทั้งสิ้น
                </td>
                <td className="pt-2 pb-1 text-right text-[14px] font-bold text-primary w-24 sm:w-32">
                  {formatNumber(data.totalAmount)}
                </td>
              </tr>
              <tr>
                <td className="pr-2 sm:pr-4 text-right text-gray-500 text-[10px]" />
                <td className="text-right text-[10px] text-gray-500">บาท</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-1 rounded bg-gray-50 px-2 py-1 text-center text-[10px] text-gray-700 border border-gray-200">
            <span className="font-medium">
              ({bahtText(data.totalAmount)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
