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
  unitCostCny?: number;
  lineTotal: number;
}

interface VendorCostData {
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
      customerName?: string | null;
      companyName?: string | null;
    };
  };
}

interface InvoiceLineItem {
  sequence: number;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface InvoiceData {
  documentNumber: string;
  documentDate: string;
  grandTotal: number;
  customerSnapshot: {
    customerName?: string;
    companyName?: string;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  vatEnabled: boolean;
  vatAmount: number;
  shippingCost: number;
}

interface ProfitData {
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

export interface VendorCostPrintData {
  vendorCost: VendorCostData;
  invoice: InvoiceData | null;
  profit: ProfitData | null;
}

interface VendorCostPrintPreviewProps {
  data: VendorCostPrintData;
}

export const VendorCostPrintPreview = forwardRef<
  HTMLDivElement,
  VendorCostPrintPreviewProps
>(function VendorCostPrintPreview({ data }, ref) {
  const { vendorCost, invoice, profit } = data;

  const hasExchangeRate = !!vendorCost.exchangeRate;
  const itemsTotal = vendorCost.items.reduce(
    (sum, item) => sum + Number(item.lineTotal),
    0
  );

  return (
    <div
      id="print-preview"
      ref={ref}
      className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-4 sm:p-6 shadow-lg flex flex-col print:shadow-none print:p-0 print:w-[210mm] print:max-w-none print:min-h-[297mm]"
    >
      {/* ===== Section 1: Cost Summary ===== */}
      <div className="mb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900">
              {vendorCost.vendorName}
              {vendorCost.orderNumber && (
                <span className="text-gray-500 font-normal text-sm ml-2">
                  PO: {vendorCost.orderNumber}
                </span>
              )}
            </h1>
            <div className="text-[10px] text-gray-500 flex gap-3 mt-0.5">
              <span>
                วันที่สั่งซื้อ:{" "}
                {formatThaiDate(new Date(vendorCost.orderDate), "short")}
              </span>
              <span>
                ชำระสินค้า:{" "}
                {PAYMENT_METHOD_LABELS[vendorCost.paymentMethod] ?? "-"}
              </span>
              <span>
                ชำระค่าส่ง:{" "}
                {PAYMENT_METHOD_LABELS[vendorCost.shippingPaymentMethod] ?? "-"}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-primary">
              ใบสรุปต้นทุน
            </h2>
            {vendorCost.document && (
              <div className="text-[10px] text-gray-500">
                บิล: {vendorCost.document.documentNumber}
              </div>
            )}
          </div>
        </div>

        {/* Cost Items Table */}
        <table className="w-full border-collapse text-[10px] mb-2">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-700 px-1 sm:px-2 py-1 text-center w-8">
                #
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 text-left">
                สินค้า
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 text-center w-12">
                จำนวน
              </th>
              {hasExchangeRate && (
                <th className="border border-gray-700 px-1 sm:px-2 py-1 text-right w-20">
                  ราคา (CNY)
                </th>
              )}
              <th className="border border-gray-700 px-1 sm:px-2 py-1 text-right w-20">
                ราคา/หน่วย
              </th>
              <th className="border border-gray-700 px-1 sm:px-2 py-1 text-right w-24">
                รวม
              </th>
            </tr>
          </thead>
          <tbody>
            {vendorCost.items.map((item, index) => (
              <tr
                key={item.sequence}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border border-gray-200 px-1 sm:px-2 py-1 text-center text-gray-600">
                  {item.sequence}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1">
                  <div className="font-medium text-gray-900">
                    {item.productName}
                  </div>
                  {item.productSku && (
                    <div className="text-[9px] text-gray-500">
                      SKU: {item.productSku}
                    </div>
                  )}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 text-center text-gray-700">
                  {item.quantity}
                </td>
                {hasExchangeRate && (
                  <td className="border border-gray-200 px-1 sm:px-2 py-1 text-right text-gray-700">
                    {item.unitCostCny
                      ? `¥${Number(item.unitCostCny).toFixed(2)}`
                      : "-"}
                  </td>
                )}
                <td className="border border-gray-200 px-1 sm:px-2 py-1 text-right text-gray-700">
                  {formatNumber(Number(item.unitCost))}
                </td>
                <td className="border border-gray-200 px-1 sm:px-2 py-1 text-right font-medium text-gray-900">
                  {formatNumber(Number(item.lineTotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Cost Breakdown */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs">
            <table className="w-full text-[10px]">
              <tbody>
                <tr>
                  <td className="py-0.5 pr-4 text-right text-gray-600">
                    ค่าสินค้า
                  </td>
                  <td className="py-0.5 text-right font-medium text-gray-900 w-28">
                    {formatNumber(itemsTotal)}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-4 text-right text-gray-600">
                    ค่าขนส่ง
                  </td>
                  <td className="py-0.5 text-right font-medium text-gray-900">
                    {formatNumber(Number(vendorCost.shippingCost))}
                  </td>
                </tr>
                {Number(vendorCost.otherCost) > 0 && (
                  <tr>
                    <td className="py-0.5 pr-4 text-right text-gray-600">
                      ค่าใช้จ่ายอื่น
                    </td>
                    <td className="py-0.5 text-right font-medium text-gray-900">
                      {formatNumber(Number(vendorCost.otherCost))}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-gray-300">
                  <td className="pt-1 pr-4 text-right font-bold text-gray-900">
                    ยอดต้นทุนรวม
                  </td>
                  <td className="pt-1 text-right font-bold text-red-600">
                    {formatNumber(Number(vendorCost.totalCost))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-300 my-3" />

      {/* ===== Section 2: Invoice Details ===== */}
      {invoice ? (
        <div className="mb-4">
          {/* Invoice Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="text-[11px] font-bold text-gray-800">
                ข้อมูลใบแจ้งหนี้
              </h3>
              <div className="text-[10px] text-gray-500">
                ลูกค้า:{" "}
                {invoice.customerSnapshot?.companyName ||
                  invoice.customerSnapshot?.customerName ||
                  "-"}
              </div>
            </div>
            <div className="text-right text-[10px] text-gray-600">
              <div className="font-medium">{invoice.documentNumber}</div>
              <div>
                {formatThaiDate(new Date(invoice.documentDate), "short")}
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <table className="w-full border-collapse text-[10px] mb-2">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="border border-blue-700 px-1 sm:px-2 py-1 text-center w-8">
                  #
                </th>
                <th className="border border-blue-700 px-1 sm:px-2 py-1 text-left">
                  สินค้า
                </th>
                <th className="border border-blue-700 px-1 sm:px-2 py-1 text-center w-12">
                  จำนวน
                </th>
                <th className="border border-blue-700 px-1 sm:px-2 py-1 text-right w-20">
                  ราคา/หน่วย
                </th>
                <th className="border border-blue-700 px-1 sm:px-2 py-1 text-right w-24">
                  รวม
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, index) => (
                <tr
                  key={item.sequence}
                  className={index % 2 === 0 ? "bg-white" : "bg-blue-50"}
                >
                  <td className="border border-gray-200 px-1 sm:px-2 py-1 text-center text-gray-600">
                    {item.sequence}
                  </td>
                  <td className="border border-gray-200 px-1 sm:px-2 py-1">
                    <div className="font-medium text-gray-900">
                      {item.productName}
                    </div>
                    {item.productSku && (
                      <div className="text-[9px] text-gray-500">
                        SKU: {item.productSku}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-200 px-1 sm:px-2 py-1 text-center text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-200 px-1 sm:px-2 py-1 text-right text-gray-700">
                    {formatNumber(Number(item.unitPrice))}
                  </td>
                  <td className="border border-gray-200 px-1 sm:px-2 py-1 text-right font-medium text-gray-900">
                    {formatNumber(Number(item.lineTotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Invoice Summary */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs">
              <table className="w-full text-[10px]">
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-4 text-right text-gray-600">
                      ยอดรวมสินค้า
                    </td>
                    <td className="py-0.5 text-right font-medium text-gray-900 w-28">
                      {formatNumber(Number(invoice.subtotal))}
                    </td>
                  </tr>
                  {Number(invoice.discountAmount) > 0 && (
                    <tr>
                      <td className="py-0.5 pr-4 text-right text-gray-600">
                        ส่วนลด
                      </td>
                      <td className="py-0.5 text-right font-medium text-red-500">
                        -{formatNumber(Number(invoice.discountAmount))}
                      </td>
                    </tr>
                  )}
                  {Number(invoice.shippingCost) > 0 && (
                    <tr>
                      <td className="py-0.5 pr-4 text-right text-gray-600">
                        ค่าขนส่ง
                      </td>
                      <td className="py-0.5 text-right font-medium text-gray-900">
                        {formatNumber(Number(invoice.shippingCost))}
                      </td>
                    </tr>
                  )}
                  {invoice.vatEnabled && Number(invoice.vatAmount) > 0 && (
                    <tr>
                      <td className="py-0.5 pr-4 text-right text-gray-600">
                        ภาษีมูลค่าเพิ่ม (VAT)
                      </td>
                      <td className="py-0.5 text-right font-medium text-gray-900">
                        {formatNumber(Number(invoice.vatAmount))}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-300">
                    <td className="pt-1 pr-4 text-right font-bold text-gray-900">
                      ยอดรวมใบแจ้งหนี้
                    </td>
                    <td className="pt-1 text-right font-bold text-blue-600">
                      {formatNumber(Number(invoice.grandTotal))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-center py-4 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded">
          ไม่มีเอกสารใบแจ้งหนี้ที่เชื่อมโยง
        </div>
      )}

      {/* Spacer to push profit section to bottom */}
      <div className="flex-grow" />

      {/* ===== Section 3: Profit Summary ===== */}
      <div className="border-t-2 border-gray-800 pt-3">
        {profit ? (
          <div className="flex justify-end">
            <div className="w-full max-w-sm">
              <h3 className="text-[11px] font-bold text-gray-800 mb-1 text-right">
                สรุปกำไร
              </h3>
              <table className="w-full text-[10px]">
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-4 text-right text-gray-600">
                      ยอดขาย (รายรับ)
                    </td>
                    <td className="py-0.5 text-right font-medium text-blue-600 w-28">
                      {formatNumber(profit.revenue)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-right text-gray-600">
                      ต้นทุน (รายจ่าย)
                    </td>
                    <td className="py-0.5 text-right font-medium text-red-600">
                      {formatNumber(profit.cost)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-800 bg-gray-100">
                    <td className="pt-2 pb-1 pr-4 text-right text-[14px] font-bold text-gray-900">
                      กำไร
                    </td>
                    <td
                      className={`pt-2 pb-1 text-right text-[14px] font-bold w-28 ${
                        profit.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {profit.profit >= 0 ? "" : "-"}
                      {formatNumber(Math.abs(profit.profit))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-right text-gray-500 text-[10px]">
                      อัตรากำไร
                    </td>
                    <td
                      className={`py-0.5 text-right font-medium text-[10px] ${
                        profit.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {profit.marginPercent.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-1 rounded bg-gray-50 px-2 py-1 text-center text-[10px] text-gray-700 border border-gray-200">
                <span className="font-medium">
                  ({bahtText(Math.abs(profit.profit))})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-[10px] text-gray-400">
            ไม่สามารถคำนวณกำไรได้ — ไม่มีเอกสารใบแจ้งหนี้ที่เชื่อมโยง
          </div>
        )}
      </div>
    </div>
  );
});
