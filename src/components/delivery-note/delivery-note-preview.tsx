"use client";

import type { ReactNode } from "react";
import { MapPin, Phone, Mail } from "lucide-react";
import { formatThaiDate } from "@/lib/thai-date";
import type { DeliveryNoteData, DeliveryNoteLine } from "@/data/delivery-notes";

const DEFAULT_UNIT = "กล่อง";

function formatQuantity(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5 text-[10px] leading-snug">
      <span className="w-20 shrink-0 font-semibold text-gray-600">{label}</span>
      <span className="min-w-0 flex-1 whitespace-pre-line text-gray-900">{children || "-"}</span>
    </div>
  );
}

function SignatureBox({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded border border-gray-300 px-2 pt-10 pb-2 text-center">
      <div className="w-full border-b border-dotted border-gray-500" />
      <p className="mt-1 text-[10px] text-gray-500">(..........................)</p>
      <p className="mt-1 text-[10px] font-semibold text-gray-800">{title}</p>
      <p className="text-[8px] uppercase tracking-wide text-gray-400">{sub}</p>
      <p className="mt-2 text-[9px] text-gray-500">วันที่ ......../......../........</p>
    </div>
  );
}

interface DeliveryNotePreviewProps {
  data: DeliveryNoteData;
  copyLabel: string;
}

export function DeliveryNotePreview({ data, copyLabel }: DeliveryNotePreviewProps) {
  const { company, customer } = data;
  const units = new Set(data.lines.map((l) => l.unitLabel?.trim() || DEFAULT_UNIT));
  const commonUnit = units.size === 1 ? [...units][0] : null;
  const totalQuantity = data.lines.reduce((sum, l) => sum + l.quantity, 0);
  const hasImages = data.lines.some((l) => l.imageUrl);
  const showRemaining = data.lines.some((l) => l.remaining != null);
  const watermark = data.status === "DRAFT" ? "ร่าง" : data.status === "CANCELLED" ? "ยกเลิก" : null;
  const customerName = customer.companyName || customer.customerName;

  return (
    <div
      id="document-preview"
      className="relative mx-auto flex w-full max-w-[210mm] min-h-[297mm] flex-col overflow-hidden bg-white p-4 text-gray-900 shadow-lg sm:p-8 print:w-[210mm] print:max-w-none print:min-h-[297mm] print:p-8 print:shadow-none"
    >
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-30 text-[120px] font-bold text-red-500/10">{watermark}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          {company.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.name} className="h-14 w-14 shrink-0 object-contain" />
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight">{company.name}</h1>
            <div className="mt-0.5 space-y-0.5 text-[8px] text-gray-600">
              {(company.address || company.taxId) && (
                <p className="flex items-start gap-1">
                  <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                  <span>
                    {company.address}
                    {company.taxId && `  เลขประจำตัวผู้เสียภาษี: ${company.taxId}`}
                  </span>
                </p>
              )}
              <p className="flex flex-wrap gap-x-3">
                {company.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" />
                    {company.phone}
                  </span>
                )}
                {company.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-2.5 w-2.5" />
                    {company.email}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <h2 className="text-xl font-bold leading-tight text-primary">ใบส่งสินค้า</h2>
          <p className="text-[9px] uppercase tracking-widest text-gray-500">Delivery Note</p>
          <p className="mt-0.5 text-[10px] text-primary/80">({copyLabel})</p>
        </div>
      </div>

      {/* Customer / document info */}
      <div className="mb-3 grid grid-cols-1 gap-3 rounded sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto] border border-gray-300 p-2.5">
        <div className="space-y-0.5">
          <Field label="ลูกค้า">{customerName}</Field>
          {customer.companyName && customer.customerName !== customer.companyName && (
            <Field label="ผู้ติดต่อ">{customer.contactPerson || customer.customerName}</Field>
          )}
          <Field label="ที่อยู่">{customer.address}</Field>
          <Field label="โทร">{customer.phone}</Field>
          {customer.taxId && <Field label="เลขผู้เสียภาษี">{customer.taxId}</Field>}
        </div>
        <div className="space-y-0.5 border-t border-gray-200 pt-2 sm:w-52 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3 print:w-52 print:border-t-0 print:border-l print:pt-0 print:pl-3">
          <Field label="เลขที่">
            <span className="font-semibold">{data.deliveryNumber ?? "(ออกเลขเมื่อบันทึก)"}</span>
          </Field>
          <Field label="วันที่ส่ง">{formatThaiDate(new Date(data.deliveryDate))}</Field>
          <Field label="อ้างอิงใบเสนอราคา">{data.quotation.documentNumber}</Field>
          {data.customerPoNumber && <Field label="เลขที่ PO">{data.customerPoNumber}</Field>}
          {data.round != null && <Field label="รอบที่ส่ง">รอบที่ {data.round}</Field>}
          <Field label="เลขใบเบิก">{data.issueNumber}</Field>
        </div>
      </div>

      {/* Delivery site / transport */}
      <div className="mb-3 grid grid-cols-1 gap-3 rounded sm:grid-cols-2 print:grid-cols-2 border border-gray-300 p-2.5">
        <div className="space-y-0.5">
          <p className="mb-1 text-[10px] font-bold text-gray-800">สถานที่ส่งสินค้า</p>
          <Field label="ที่อยู่หน้างาน">{data.deliveryAddress}</Field>
          <Field label="ผู้รับหน้างาน">
            {[data.deliveryContactName, data.deliveryContactPhone].filter(Boolean).join(" · ")}
          </Field>
        </div>
        <div className="space-y-0.5 border-t border-gray-200 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3 print:border-t-0 print:border-l print:pt-0 print:pl-3">
          <p className="mb-1 text-[10px] font-bold text-gray-800">การขนส่ง</p>
          <Field label="ทะเบียนรถ">{data.vehiclePlate}</Field>
          <Field label="คนขับ">{data.driverName}</Field>
          <Field label="ขนส่ง">{data.carrierName}</Field>
        </div>
      </div>

      {/* Items */}
      <table className="mb-3 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="w-8 border border-gray-700 px-1 py-1.5 text-center">ลำดับ</th>
            {hasImages && <th className="w-16 border border-gray-700 px-1 py-1.5 text-center">รูป</th>}
            <th className="border border-gray-700 px-2 py-1.5 text-left">รายการ</th>
            {showRemaining && <th className="w-14 border border-gray-700 px-1 py-1.5 text-center">สั่ง</th>}
            <th className="w-16 border border-gray-700 px-1 py-1.5 text-center">ส่งครั้งนี้</th>
            <th className="w-12 border border-gray-700 px-1 py-1.5 text-center">หน่วย</th>
            {showRemaining && <th className="w-14 border border-gray-700 px-1 py-1.5 text-center">ค้างส่ง</th>}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, index) => {
            return (
              <tr key={line.sequence} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-1 py-1.5 text-center align-top">{line.sequence}</td>
                {hasImages && (
                  <td className="border border-gray-300 p-1 text-center align-top">
                    {line.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={line.imageUrl}
                        alt={line.productName}
                        className="mx-auto h-14 w-14 rounded object-cover"
                      />
                    )}
                  </td>
                )}
                <td className="border border-gray-300 px-2 py-1.5 align-top">
                  <p className="font-medium">{line.productName}</p>
                  <p className="text-[9px] text-gray-500">
                    {line.productSku}
                    {line.colorVariantName &&
                      ` · สี: ${line.colorVariantName}${line.colorVariantSku ? ` (${line.colorVariantSku})` : ""}`}
                  </p>
                </td>
                {showRemaining && (
                  <td className="border border-gray-300 px-1 py-1.5 text-center align-top">
                    {line.ordered != null ? formatQuantity(line.ordered) : "-"}
                  </td>
                )}
                <td className="border border-gray-300 px-1 py-1.5 text-center align-top font-bold">
                  {formatQuantity(line.quantity)}
                </td>
                <td className="border border-gray-300 px-1 py-1.5 text-center align-top">
                  {line.unitLabel?.trim() || DEFAULT_UNIT}
                </td>
                {showRemaining && (
                  <td className="border border-gray-300 px-1 py-1.5 text-center align-top">
                    {line.remaining != null ? formatQuantity(line.remaining) : "-"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold">
            <td className="border border-gray-300 px-2 py-1.5 text-right" colSpan={(hasImages ? 1 : 0) + (showRemaining ? 3 : 2)}>
              รวม {data.lines.length} รายการ
            </td>
            <td className="border border-gray-300 px-1 py-1.5 text-center">{formatQuantity(totalQuantity)}</td>
            <td className="border border-gray-300 px-1 py-1.5 text-center">{commonUnit ?? ""}</td>
            {showRemaining && <td className="border border-gray-300" />}
          </tr>
        </tfoot>
      </table>

      {data.deliveryRemark && (
        <p className="mb-3 whitespace-pre-line text-[10px] text-gray-700">
          <span className="font-bold underline">หมายเหตุ</span>: {data.deliveryRemark}
        </p>
      )}

      {/* Footer pinned to the bottom of the page */}
      <div className="mt-auto">
        <p className="mb-2 text-[10px] text-gray-700">
          ได้รับสินค้าตามรายการข้างต้นไว้ถูกต้องครบถ้วนและอยู่ในสภาพเรียบร้อยแล้ว
        </p>
        <div className="flex gap-1.5 sm:gap-3">
          <SignatureBox title="ผู้จัดของ / ผู้ตรวจสอบ" sub="Prepared by" />
          <SignatureBox title="ผู้ส่งสินค้า" sub="Delivered by" />
          <SignatureBox title="ผู้รับสินค้า" sub="Received by" />
        </div>
      </div>
    </div>
  );
}
