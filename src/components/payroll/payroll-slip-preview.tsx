"use client";

import { forwardRef, type ReactNode } from "react";
import { formatNumber } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { bahtText } from "@/lib/thai-number";
import { LEAVE_PERIOD_LABELS, LEAVE_TYPE_LABELS } from "@/lib/constants";
import { leaveDetailUnpaidHours, type PayrollLeaveDetail } from "@/lib/payroll";

export interface PayrollSlipData {
  year: number;
  month: number;
  employeeName: string;
  email: string;
  status: string;
  monthlySalary: number;
  dailyRate: number;
  hourlyRate: number;
  paidDays: number;
  baseAmount: number;
  leaveHours: number;
  unpaidLeaveHours: number;
  leaveDeduction: number;
  leaveDetails: PayrollLeaveDetail[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  notes: string | null;
  items: { kind: string; name: string; amount: number }[];
  company?: {
    name: string;
    address?: string | null;
    logoUrl?: string | null;
    phone?: string | null;
    taxId?: string | null;
  };
}

const cell = "border-b border-gray-100 px-3 py-1.5";
const pad2 = (n: number) => String(n).padStart(2, "0");

function InfoRow({ label, sub, value }: { label: string; sub: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <div className="w-28 shrink-0 leading-tight">
        <div className="text-[10px] font-semibold text-gray-700">{label}</div>
        <div className="text-[8px] uppercase tracking-wide text-gray-400">{sub}</div>
      </div>
      <div className="min-w-0 text-[11px] text-gray-900">{value}</div>
    </div>
  );
}

export const PayrollSlipPreview = forwardRef<HTMLDivElement, { data: PayrollSlipData }>(
  function PayrollSlipPreview({ data }, ref) {
    const lastDay = new Date(Date.UTC(data.year, data.month, 0)).getUTCDate();
    const shortMonth = formatThaiDate(new Date(Date.UTC(data.year, data.month - 1, 1)), "short").split(" ")[1];
    const periodLabel = `01–${pad2(lastDay)} ${shortMonth} ${data.year + 543}`;
    // Confirmed payroll is posted as an expense on the last day of the month.
    const paymentDate = formatThaiDate(new Date(Date.UTC(data.year, data.month - 1, lastDay)));
    const earnings = [
      { name: `เงินเดือน (${data.paidDays} วัน × ${formatNumber(data.dailyRate)} บาท)`, amount: data.baseAmount },
      ...data.items.filter((i) => i.kind === "EARNING"),
    ];
    const deductions = [
      ...(data.unpaidLeaveHours > 0
        ? [
            {
              name: `หักลาเกินสิทธิ์/ไม่รับค่าจ้าง ${data.unpaidLeaveHours} ชม. × ${formatNumber(data.hourlyRate)} บาท`,
              amount: data.leaveDeduction,
            },
          ]
        : []),
      ...data.items.filter((i) => i.kind === "DEDUCTION"),
    ];
    const rows = Math.max(earnings.length, deductions.length, 3);
    const totalIncome = data.baseAmount + data.totalEarnings;
    const totalDeduct = data.leaveDeduction + data.totalDeductions;

    return (
      <div
        id="summary-preview"
        ref={ref}
        className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-4 sm:p-8 shadow-lg flex flex-col text-gray-900 print:shadow-none print:p-0 print:w-[210mm] print:max-w-none print:min-h-[297mm]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {data.company?.logoUrl && (
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.company.logoUrl} alt={data.company.name} className="h-full w-full object-contain" />
              </div>
            )}
            <div className="min-w-0 leading-snug">
              <h1 className="text-base sm:text-lg font-bold break-words">{data.company?.name ?? ""}</h1>
              {data.company?.address && <p className="text-[10px] text-gray-600">{data.company.address}</p>}
              <p className="text-[10px] text-gray-600">
                {[
                  data.company?.taxId && `เลขประจำตัวผู้เสียภาษี ${data.company.taxId}`,
                  data.company?.phone && `โทร ${data.company.phone}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">สลิปเงินเดือน</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Pay Slip</p>
            {data.status === "DRAFT" && (
              <span className="mt-1 inline-block rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                ฉบับร่าง
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 mb-5 h-1 rounded-full bg-gray-800" />

        {/* Employee / period */}
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 print:grid-cols-2">
          <div>
            <InfoRow label="ชื่อ-นามสกุล" sub="Employee name" value={<span className="font-semibold">{data.employeeName}</span>} />
            <InfoRow label="อีเมล" sub="Email" value={data.email} />
            <InfoRow label="เงินเดือน" sub="Monthly salary" value={`${formatNumber(data.monthlySalary)} บาท`} />
            <InfoRow
              label="อัตราค่าแรง"
              sub="Wage rate"
              value={`${formatNumber(data.dailyRate)} บาท/วัน · ${formatNumber(data.hourlyRate)} บาท/ชม.`}
            />
          </div>
          <div>
            <InfoRow label="รอบเงินเดือน" sub="Payroll period" value={<span className="font-semibold">{periodLabel}</span>} />
            <InfoRow label="วันที่จ่าย" sub="Payment date" value={paymentDate} />
            <InfoRow label="วันทำงานที่คิดเงิน" sub="Paid days" value={`${data.paidDays} / 30 วัน`} />
          </div>
        </div>

        {/* Earnings / deductions */}
        <div className="mb-5 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-3 py-2 text-left font-semibold">
                  รายได้
                  <span className="block text-[9px] font-normal uppercase tracking-wide text-gray-300">Earnings</span>
                </th>
                <th className="px-3 py-2 text-right font-semibold w-28">
                  จำนวนเงิน
                  <span className="block text-[9px] font-normal uppercase tracking-wide text-gray-300">Amount</span>
                </th>
                <th className="border-l border-gray-600 px-3 py-2 text-left font-semibold">
                  รายการหัก
                  <span className="block text-[9px] font-normal uppercase tracking-wide text-gray-300">Deductions</span>
                </th>
                <th className="px-3 py-2 text-right font-semibold w-28">
                  จำนวนเงิน
                  <span className="block text-[9px] font-normal uppercase tracking-wide text-gray-300">Amount</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i}>
                  <td className={cell}>{earnings[i]?.name ?? " "}</td>
                  <td className={`${cell} text-right tabular-nums`}>{earnings[i] ? formatNumber(earnings[i].amount) : ""}</td>
                  <td className={`${cell} border-l border-l-gray-200`}>{deductions[i]?.name ?? ""}</td>
                  <td className={`${cell} text-right tabular-nums`}>
                    {deductions[i] ? formatNumber(deductions[i].amount) : ""}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-3 py-2">รวมรายได้</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(totalIncome)}</td>
                <td className="border-l border-gray-200 px-3 py-2">รวมรายการหัก</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(totalDeduct)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net pay */}
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg bg-gray-800 px-4 py-3 text-white">
          <div>
            <div className="text-sm font-bold">
              เงินได้สุทธิ <span className="text-[10px] font-normal uppercase tracking-wide text-gray-300">Net pay</span>
            </div>
            <div className="text-[10px] text-gray-300">({bahtText(data.netPay)})</div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums">{formatNumber(data.netPay)} บาท</div>
        </div>

        {/* Leave detail */}
        <div className="mb-4">
          <h3 className="text-[11px] font-bold mb-1">
            รายละเอียดวันลา{" "}
            <span className="font-normal text-gray-500">(นับตามชั่วโมง 9:00–18:00 = 8 ชม./วัน · หักเฉพาะส่วนที่เกินสิทธิ์)</span>
          </h3>
          {data.leaveDetails.length === 0 ? (
            <p className="text-[10px] text-gray-500">ไม่มีวันลาในเดือนนี้</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className={`${cell} text-left`}>วันที่</th>
                    <th className={`${cell} text-left`}>ประเภท</th>
                    <th className={`${cell} text-left`}>ช่วงเวลา</th>
                    <th className={`${cell} text-right`}>ชั่วโมง</th>
                    <th className={`${cell} text-right`}>ได้ค่าจ้าง (ชม.)</th>
                    <th className={`${cell} text-right`}>หัก (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaveDetails.map((d) => (
                    <tr key={d.date}>
                      <td className={cell}>{formatThaiDate(new Date(d.date))}</td>
                      <td className={cell}>{LEAVE_TYPE_LABELS[d.type] ?? d.type}</td>
                      <td className={cell}>{LEAVE_PERIOD_LABELS[d.period] ?? d.period}</td>
                      <td className={`${cell} text-right tabular-nums`}>{d.hours}</td>
                      <td className={`${cell} text-right tabular-nums`}>{d.hours - leaveDetailUnpaidHours(d)}</td>
                      <td className={`${cell} text-right tabular-nums`}>
                        {formatNumber(leaveDetailUnpaidHours(d) * data.hourlyRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data.notes && (
          <div className="mb-4 text-[10px]">
            <span className="font-bold">หมายเหตุ: </span>
            {data.notes}
          </div>
        )}

        <div className="flex-grow" />

        <p className="mb-10 text-[9px] text-gray-500">
          คิดเงินเดือนแบบ 30 วันทุกเดือน: ค่าแรงรายวัน = เงินเดือน ÷ 30, ค่าแรงรายชั่วโมง = ค่าแรงรายวัน ÷ 8
        </p>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 text-[11px] text-center">
          <div>
            <div className="border-b border-gray-400 h-10" />
            <div className="mt-1 font-semibold">ผู้จ่ายเงิน</div>
            <div className="text-gray-500">วันที่ ......../......../........</div>
          </div>
          <div>
            <div className="border-b border-gray-400 h-10" />
            <div className="mt-1 font-semibold">ผู้รับเงิน ({data.employeeName})</div>
            <div className="text-gray-500">วันที่ ......../......../........</div>
          </div>
        </div>
      </div>
    );
  }
);
