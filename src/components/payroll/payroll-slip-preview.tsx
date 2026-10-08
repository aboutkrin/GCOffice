"use client";

import { forwardRef } from "react";
import { formatNumber } from "@/lib/thai-currency";
import { formatThaiDate, THAI_MONTHS } from "@/lib/thai-date";
import { bahtText } from "@/lib/thai-number";
import { LEAVE_PERIOD_LABELS, LEAVE_TYPE_LABELS } from "@/lib/constants";
import { leaveDetailUnpaidHours, type PayrollLeaveDetail } from "@/lib/payroll";
import { formatLeaveHours, LEAVE_BALANCE_ORDER, LEAVE_MAIN_TYPES, type LeaveTypeBalance } from "@/lib/leave-policy";

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
  /** Leave balance for the year as of the end of the slip month */
  leaveBalances?: Record<string, LeaveTypeBalance>;
  company?: {
    name: string;
    address?: string | null;
    logoUrl?: string | null;
    phone?: string | null;
  };
}

const cell = "border border-gray-200 px-2 py-1";

export const PayrollSlipPreview = forwardRef<HTMLDivElement, { data: PayrollSlipData }>(
  function PayrollSlipPreview({ data }, ref) {
    const periodLabel = `ประจำเดือน ${THAI_MONTHS[data.month - 1]} พ.ศ. ${data.year + 543}`;
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
    const rows = Math.max(earnings.length, deductions.length);
    const totalIncome = data.baseAmount + data.totalEarnings;
    const totalDeduct = data.leaveDeduction + data.totalDeductions;

    return (
      <div
        id="summary-preview"
        ref={ref}
        className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-4 sm:p-6 shadow-lg flex flex-col text-gray-900 print:shadow-none print:p-0 print:w-[210mm] print:max-w-none print:min-h-[297mm]"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {data.company?.logoUrl && (
              <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.company.logoUrl} alt={data.company.name} className="h-full w-full object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold break-words">{data.company?.name ?? ""}</h1>
              {data.company?.address && <p className="text-[10px] text-gray-600">{data.company.address}</p>}
              {data.company?.phone && <p className="text-[10px] text-gray-600">โทร {data.company.phone}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <h2 className="text-lg sm:text-2xl font-bold text-primary">ใบสรุปเงินเดือน</h2>
            <p className="text-xs text-gray-600">{periodLabel}</p>
            {data.status === "DRAFT" && <p className="text-[10px] text-amber-600">(ฉบับร่าง)</p>}
          </div>
        </div>

        {/* Employee */}
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">ชื่อพนักงาน: </span>
            <span className="font-semibold">{data.employeeName}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500">เงินเดือนเต็มเดือน: </span>
            <span className="font-semibold">{formatNumber(data.monthlySalary)} บาท</span>
          </div>
          <div>
            <span className="text-gray-500">อัตราค่าแรง: </span>
            {formatNumber(data.dailyRate)} บาท/วัน · {formatNumber(data.hourlyRate)} บาท/ชม.
          </div>
          <div className="text-right">
            <span className="text-gray-500">วันทำงานที่คิดเงินเดือน: </span>
            {data.paidDays} / 30 วัน
          </div>
        </div>

        {/* Earnings / deductions */}
        <table className="w-full border-collapse text-[11px] mb-4">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-700 px-2 py-1.5 text-left">รายได้</th>
              <th className="border border-gray-700 px-2 py-1.5 text-right w-24">จำนวนเงิน</th>
              <th className="border border-gray-700 px-2 py-1.5 text-left">รายการหัก</th>
              <th className="border border-gray-700 px-2 py-1.5 text-right w-24">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                <td className={cell}>{earnings[i]?.name ?? ""}</td>
                <td className={`${cell} text-right`}>{earnings[i] ? formatNumber(earnings[i].amount) : ""}</td>
                <td className={cell}>{deductions[i]?.name ?? ""}</td>
                <td className={`${cell} text-right`}>{deductions[i] ? formatNumber(deductions[i].amount) : ""}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className={cell}>รวมรายได้</td>
              <td className={`${cell} text-right`}>{formatNumber(totalIncome)}</td>
              <td className={cell}>รวมรายการหัก</td>
              <td className={`${cell} text-right`}>{formatNumber(totalDeduct)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-4 flex items-center justify-between rounded border-2 border-gray-800 px-3 py-2">
          <div>
            <div className="text-sm font-bold">เงินได้สุทธิ</div>
            <div className="text-[10px] text-gray-600">({bahtText(data.netPay)})</div>
          </div>
          <div className="text-xl font-bold">{formatNumber(data.netPay)} บาท</div>
        </div>

        {/* Leave detail */}
        <div className="mb-4">
          <h3 className="text-[11px] font-bold mb-1">
            รายละเอียดวันลา (นับตามชั่วโมง 9:00–18:00 = 8 ชม./วัน · หักเฉพาะส่วนที่เกินสิทธิ์)
          </h3>
          {data.leaveDetails.length === 0 ? (
            <p className="text-[10px] text-gray-500">ไม่มีวันลาในเดือนนี้</p>
          ) : (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-100">
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
                    <td className={`${cell} text-right`}>{d.hours}</td>
                    <td className={`${cell} text-right`}>{d.hours - leaveDetailUnpaidHours(d)}</td>
                    <td className={`${cell} text-right`}>
                      {formatNumber(leaveDetailUnpaidHours(d) * data.hourlyRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data.leaveBalances && (
          <div className="mb-4">
            <h3 className="text-[11px] font-bold mb-1">
              สิทธิ์วันลาคงเหลือ ปี {data.year + 543} (ณ สิ้นเดือน{THAI_MONTHS[data.month - 1]})
            </h3>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className={`${cell} text-left`}>ประเภท</th>
                  <th className={`${cell} text-right`}>สิทธิ์/ปี</th>
                  <th className={`${cell} text-right`}>ใช้ไป</th>
                  <th className={`${cell} text-right`}>คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {LEAVE_BALANCE_ORDER.filter(
                  (t) =>
                    (LEAVE_MAIN_TYPES as readonly string[]).includes(t) ||
                    (data.leaveBalances![t]?.usedHours ?? 0) > 0
                ).map((t) => {
                  const b = data.leaveBalances![t];
                  const limit = b.quotaHours ?? b.paidQuotaHours;
                  return (
                    <tr key={t}>
                      <td className={cell}>{LEAVE_TYPE_LABELS[t] ?? t}</td>
                      <td className={`${cell} text-right`}>{limit === null ? "ไม่จำกัด" : formatLeaveHours(limit)}</td>
                      <td className={`${cell} text-right`}>{formatLeaveHours(b.usedHours)}</td>
                      <td className={`${cell} text-right`}>
                        {b.remainingHours === null ? "-" : formatLeaveHours(b.remainingHours)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data.notes && (
          <div className="mb-4 text-[10px]">
            <span className="font-bold">หมายเหตุ: </span>
            {data.notes}
          </div>
        )}

        <div className="flex-grow" />

        <p className="mb-8 text-[9px] text-gray-500">
          คิดเงินเดือนแบบ 30 วันทุกเดือน: ค่าแรงรายวัน = เงินเดือน ÷ 30, ค่าแรงรายชั่วโมง = ค่าแรงรายวัน ÷ 8
        </p>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 text-[11px] text-center">
          <div>
            <div className="border-b border-gray-400 h-10" />
            <div className="mt-1">ผู้จ่ายเงิน</div>
            <div className="text-gray-500">วันที่ ......../......../........</div>
          </div>
          <div>
            <div className="border-b border-gray-400 h-10" />
            <div className="mt-1">ผู้รับเงิน ({data.employeeName})</div>
            <div className="text-gray-500">วันที่ ......../......../........</div>
          </div>
        </div>
      </div>
    );
  }
);
