"use client";

import { forwardRef } from "react";
import { formatNumber } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { bahtText } from "@/lib/thai-number";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

interface VendorCostItem {
  sequence: number;
  productName: string;
  productSku?: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

interface VendorCostEntry {
  id: string;
  vendorName: string;
  orderNumber?: string;
  orderDate: string;
  exchangeRate?: number;
  shippingCost: number;
  otherCost: number;
  totalCost: number;
  paymentMethod: string;
  shippingPaymentMethod: string;
  items: VendorCostItem[];
  document?: {
    documentNumber: string;
    customer?: {
      customerName?: string;
      companyName?: string;
    };
  };
}

interface CompanyData {
  name: string;
  address?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
}

export interface VendorCostSummaryData {
  vendorCosts: VendorCostEntry[];
  totalCost: number;
  periodLabel: string;
  company?: CompanyData;
}

interface VendorCostSummaryPreviewProps {
  data: VendorCostSummaryData;
}

export const VendorCostSummaryPreview = forwardRef<
  HTMLDivElement,
  VendorCostSummaryPreviewProps
>(function VendorCostSummaryPreview({ data }, ref) {
  // Group by vendor for summary
  const vendorTotals = data.vendorCosts.reduce<
    Record<string, { name: string; total: number; count: number }>
  >((acc, vc) => {
    const name = vc.vendorName;
    if (!acc[name]) {
      acc[name] = { name, total: 0, count: 0 };
    }
    acc[name].total += Number(vc.totalCost);
    acc[name].count += 1;
    return acc;
  }, {});

  const sortedVendors = Object.values(vendorTotals).sort(
    (a, b) => b.total - a.total
  );

  // Total item count across all vendor costs
  const totalItemCount = data.vendorCosts.reduce(
    (sum, vc) => sum + (vc.items?.length ?? 0),
    0
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
              ใบสรุปต้นทุนใบสั่งซื้อ
            </h2>
          </div>
        </div>
        <div className="text-sm text-gray-600 text-right">
          {data.periodLabel}
        </div>
      </div>

      {/* Vendor Cost Entries Table */}
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
                Vendor / PO
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-left">
                เลขที่บิล
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-10 sm:w-14">
                รายการ
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-center w-14 sm:w-20">
                วิธีชำระ
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 sm:py-1.5 text-right w-16 sm:w-28">
                ยอดรวม
              </th>
            </tr>
          </thead>
          <tbody>
            {data.vendorCosts.map((vc, index) => (
              <tr
                key={vc.id}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-600">
                  {index + 1}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-700">
                  {formatThaiDate(new Date(vc.orderDate), "short")}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5">
                  <div className="font-medium text-gray-900">
                    {vc.vendorName}
                  </div>
                  {vc.orderNumber && (
                    <div className="text-[9px] text-gray-500">
                      PO: {vc.orderNumber}
                    </div>
                  )}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-gray-700">
                  {vc.document ? (
                    <div>
                      <div className="font-medium">
                        {vc.document.documentNumber}
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {vc.document.customer?.companyName ||
                          vc.document.customer?.customerName}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-700">
                  {vc.items?.length ?? 0}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-center text-gray-700">
                  <div>{PAYMENT_METHOD_LABELS[vc.paymentMethod] ?? "-"}</div>
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 sm:py-1.5 text-right font-medium text-gray-900">
                  {formatNumber(vc.totalCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Vendor Summary */}
      {sortedVendors.length > 0 && (
        <div className="mb-3">
          <h3 className="text-[11px] font-bold text-gray-800 mb-1">
            สรุปตาม Vendor
          </h3>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-1 text-left">
                  Vendor
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
              {sortedVendors.map((v) => (
                <tr key={v.name}>
                  <td className="border border-gray-200 px-2 py-1 text-gray-700">
                    {v.name}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-center text-gray-600">
                    {v.count} ครั้ง
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-900">
                    {formatNumber(v.total)}
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
                  ใบสั่งซื้อทั้งหมด
                </td>
                <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                  {data.vendorCosts.length} รายการ
                </td>
              </tr>
              <tr>
                <td className="py-0.5 sm:py-1 pr-2 sm:pr-4 text-right text-gray-600">
                  สินค้าทั้งหมด
                </td>
                <td className="py-0.5 sm:py-1 text-right font-medium text-gray-900 w-24 sm:w-32">
                  {totalItemCount} รายการ
                </td>
              </tr>
              <tr className="border-t-2 border-gray-800 bg-gray-100">
                <td className="pt-2 pb-1 pr-2 sm:pr-4 text-right text-[14px] font-bold text-gray-900">
                  รวมต้นทุนทั้งสิ้น
                </td>
                <td className="pt-2 pb-1 text-right text-[14px] font-bold text-primary w-24 sm:w-32">
                  {formatNumber(data.totalCost)}
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
              ({bahtText(data.totalCost)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
