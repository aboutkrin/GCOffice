import Link from "next/link";
import { AlertTriangle, Info, Package } from "lucide-react";

import { getInventoryValue, getProfitReport } from "@/data/profit-report";
import { formatBaht } from "@/lib/thai-currency";
import { getThaiNow, THAI_MONTHS } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ProfitReportFilters } from "@/components/profit-report/profit-report-filters";
import { MarginBadge, ProfitReportTable } from "@/components/profit-report/profit-report-table";

export const dynamic = "force-dynamic";

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = getThaiNow();
  const year = Number(params.year) || now.year;
  const month = params.month === "all" ? undefined : Number(params.month) || now.month;

  const [report, inventory] = await Promise.all([getProfitReport({ year, month }), getInventoryValue()]);
  const years = Array.from({ length: 5 }, (_, i) => now.year - i);
  const period = month ? `${THAI_MONTHS[month - 1]} ${year + 543}` : `ปี ${year + 543}`;
  const { totals } = report;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">กำไรต่อบิล</h1>
          <p className="text-muted-foreground text-sm">
            ใบเสนอราคาที่ยืนยันแล้วใน{period} — ต้นทุนเฉลี่ยถ่วงน้ำหนักจากล็อตนำเข้า ล็อกไว้ตอนยืนยันบิล
          </p>
        </div>
        <ProfitReportFilters year={year} month={month} years={years} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="ยอดขาย (ไม่รวม VAT)" value={formatBaht(totals.revenue)} />
        <Stat label="ต้นทุนสินค้าที่ขาย" value={formatBaht(totals.cogs)} />
        <Stat label="ค่าส่งจริง" value={formatBaht(totals.actualDeliveryCost)} />
        <Stat
          label="กำไรขั้นต้น"
          value={formatBaht(totals.profit)}
          valueClassName={totals.profit >= 0 ? "text-emerald-600" : "text-red-600"}
          extra={<MarginBadge percent={totals.marginPercent} />}
        />
        <Stat
          label="มูลค่าสต็อกคงเหลือ (ต้นทุน)"
          value={formatBaht(inventory.value)}
          extra={
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Package className="size-3" />
              {inventory.boxes.toLocaleString("th-TH")} หน่วย
              {inventory.boxesWithoutCost > 0 && ` (ไม่มีต้นทุน ${inventory.boxesWithoutCost.toLocaleString("th-TH")})`}
            </span>
          }
        />
      </div>

      <div className="bg-muted/50 text-muted-foreground flex gap-2 rounded-lg p-3 text-xs">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          ซื้อล็อตนำเข้า = ของในสต็อก ยังไม่ใช่ค่าใช้จ่าย ต้นทุนจะเข้าเดือนที่ขายได้ตามจำนวนที่ขายจริง
          (จำนวน × ต้นทุนเฉลี่ยต่อหน่วย) ส่วนที่ยังขายไม่ได้คือ &ldquo;มูลค่าสต็อกคงเหลือ&rdquo;
          — ต้นทุนรวมบนแดชบอร์ด = ค่าใช้จ่ายรายเดือน + ต้นทุนสินค้าที่ขาย + ค่าส่งจริง ของบิลในหน้านี้
        </p>
      </div>

      {(totals.billsMissingCost > 0 || report.legacyCostedBills > 0) && (
        <div className="space-y-1 text-xs text-amber-700">
          {totals.billsMissingCost > 0 && (
            <p className="flex items-center gap-1">
              <AlertTriangle className="size-3" />
              {totals.billsMissingCost} บิลมีสินค้าที่ยังไม่มีต้นทุน กำไรจึงสูงเกินจริง — กรอกต้นทุนในบิล หรือเพิ่ม
              <Link href="/import-lots" className="underline">ล็อตนำเข้า</Link>
            </p>
          )}
          {report.legacyCostedBills > 0 && (
            <p className="flex items-center gap-1">
              <AlertTriangle className="size-3" />
              ไม่รวม {report.legacyCostedBills} บิลที่บันทึกต้นทุนไว้ใน
              <Link href="/vendor-costs" className="underline">ต้นทุนใบสั่งซื้อ (แบบเก่า)</Link>
            </p>
          )}
        </div>
      )}

      {report.rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">ยังไม่มีบิลที่ยืนยันใน{period}</CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <ProfitReportTable rows={report.rows} />
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
  extra,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={cn("text-lg font-semibold tabular-nums", valueClassName)}>{value}</p>
        {extra}
      </CardContent>
    </Card>
  );
}
