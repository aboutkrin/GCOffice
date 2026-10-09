import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Package,
  Wallet,
} from "lucide-react";

import type { MonthBill, MonthFinance } from "@/data/finance";
import { financeMonthHref, percentChange, shiftMonth } from "@/lib/finance";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDateShort, THAI_MONTHS, THAI_MONTHS_SHORT } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import { buildCategoryColors } from "@/components/expenses/expense-utils";
import { MarginBadge } from "@/components/profit-report/profit-report-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TONE = {
  revenue: "text-[oklch(0.45_0.15_260)] dark:text-[oklch(0.72_0.13_260)]",
  cost: "text-[oklch(0.55_0.2_25)] dark:text-[oklch(0.7_0.17_25)]",
  expense: "text-[oklch(0.6_0.14_60)] dark:text-[oklch(0.78_0.13_70)]",
};

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${THAI_MONTHS_SHORT[d.getUTCMonth()]}`;
}

function billLabel(b: { documentNumber: string | null }) {
  return b.documentNumber ?? "ร่าง";
}

interface Props {
  data: MonthFinance;
  /** Current Thai year / month: the switcher stops there */
  now: { year: number; month: number };
}

export function MonthFinanceView({ data, now }: Props) {
  const { summary: s, previous: p } = data;
  const title = `${THAI_MONTHS[data.month - 1]} ${data.year + 543}`;
  const prev = shiftMonth(data.year, data.month, -1);
  const next = shiftMonth(data.year, data.month, 1);
  const hasNext = next.year < now.year || (next.year === now.year && next.month <= now.month);
  const change = percentChange(s.netProfit, p.netProfit);
  const colorOf = buildCategoryColors(data.categoryOrder);
  const maxCategory = Math.max(1, ...data.expenseCategories.map((c) => c.total));
  const costedBills = data.bills.filter((b) => !b.legacy);
  const owingBills = data.bills.filter((b) => b.outstanding > 0);
  const profitReportHref = `/profit-report?year=${data.year}&month=${data.month}`;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header + month switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ‹ แดชบอร์ด
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">สรุปการเงิน {title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={financeMonthHref(prev.year, prev.month)}
            aria-label="เดือนก่อน"
            className="flex size-9 items-center justify-center rounded-md border bg-card hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-[110px] text-center font-semibold tabular-nums">
            {THAI_MONTHS_SHORT[data.month - 1]} {data.year + 543}
          </span>
          {hasNext ? (
            <Link
              href={financeMonthHref(next.year, next.month)}
              aria-label="เดือนถัดไป"
              className="flex size-9 items-center justify-center rounded-md border bg-card hover:bg-accent"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="flex size-9 items-center justify-center rounded-md border text-muted-foreground/40">
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      </div>

      {/* Hero: net profit */}
      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">กำไรสุทธิ {title}</p>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums sm:text-4xl",
                s.netProfit >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatBaht(s.netProfit)}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {s.revenue > 0 ? `กำไร ${s.marginPercent.toFixed(1)}% ของรายได้` : "ยังไม่มีรายได้ในเดือนนี้"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm tabular-nums">
            {change != null && (
              <span className={cn("flex items-center font-medium", change >= 0 ? "text-green-600" : "text-red-600")}>
                {change >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                {Math.abs(change).toFixed(0)}%
              </span>
            )}
            <span className="text-muted-foreground">
              เทียบ {THAI_MONTHS_SHORT[p.month - 1]} ({formatBaht(p.netProfit)})
            </span>
          </div>
        </CardContent>
      </Card>

      {(data.billsMissingCost > 0 || data.legacyBills > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {data.billsMissingCost > 0 &&
                `${data.billsMissingCost} บิลยังไม่มีต้นทุนสินค้าบางรายการ กำไรเดือนนี้จึงอาจสูงกว่าจริง`}
              {data.billsMissingCost > 0 && data.legacyBills > 0 && " · "}
              {data.legacyBills > 0 &&
                `${data.legacyBills} บิลใช้ต้นทุนจากหน้าต้นทุนใบสั่งซื้อเดิม (นับตามวันที่สั่งซื้อ)`}
            </span>
          </span>
          {data.billsMissingCost > 0 && (
            <Link href={profitReportHref} className="font-semibold underline-offset-2 hover:underline">
              ใส่ต้นทุน ›
            </Link>
          )}
        </div>
      )}

      {/* Statement */}
      <Card className="py-2">
        <CardContent className="px-3 tabular-nums sm:px-6">
          <StatementRow
            label="รายได้ (ไม่รวม VAT)"
            sub={`${data.bills.length} บิล · VAT ขายที่ต้องนำส่ง ${formatBaht(s.vat)}`}
            amount={s.revenue}
            className={TONE.revenue}
          >
            {data.bills.map((b) => (
              <DrillRow key={b.id} href={`/quotations/${b.id}`} label={`${billLabel(b)} · ${b.customerName}`}>
                {formatBaht(b.revenue)}
              </DrillRow>
            ))}
          </StatementRow>
          <StatementRow
            op="−"
            label="ต้นทุนสินค้า"
            sub="จากล็อตนำเข้า ตามสินค้าที่ขายในบิล"
            amount={s.cogs}
            className={TONE.cost}
          >
            {[...costedBills]
              .sort((a, b) => b.cogs - a.cogs)
              .map((b) => (
                <DrillRow key={b.id} href={`/quotations/${b.id}`} label={billLabel(b)}>
                  {b.missingCostLines > 0 && (
                    <Badge variant="outline" className="mr-2 border-amber-300 text-amber-700">
                      ไม่มีต้นทุน {b.missingCostLines} รายการ
                    </Badge>
                  )}
                  {formatBaht(b.cogs)}
                </DrillRow>
              ))}
          </StatementRow>
          <StatementRow op="−" label="ค่าส่งที่จ่ายจริง" amount={s.deliveryCost} className={TONE.cost}>
            {costedBills
              .filter((b) => b.deliveryCost > 0)
              .map((b) => (
                <DrillRow key={b.id} href={`/quotations/${b.id}`} label={billLabel(b)}>
                  {formatBaht(b.deliveryCost)}
                </DrillRow>
              ))}
          </StatementRow>
          {s.legacyVendorCost > 0 && (
            <StatementRow
              op="−"
              label="ต้นทุนใบสั่งซื้อเดิม"
              sub="บันทึกจากหน้าต้นทุนใบสั่งซื้อแบบเก่า นับตามวันที่สั่งซื้อ"
              amount={s.legacyVendorCost}
              className={TONE.cost}
            />
          )}
          <TotalRow label="กำไรขั้นต้น" sub={`${s.grossMarginPercent.toFixed(1)}% ของรายได้`} amount={s.grossProfit} />
          <StatementRow
            op="−"
            label="ค่าใช้จ่ายประจำเดือน"
            sub={`${data.expenses.length} รายการ · ${data.expenseCategories.length} หมวด`}
            amount={s.operatingExpense}
            className={TONE.expense}
            defaultOpen={data.expenseCategories.length > 0}
          >
            {data.expenseCategories.map((c) => (
              <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(c.id) }} />
                  <span className="truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.count} รายการ</span>
                </span>
                <span>{formatBaht(c.total)}</span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(c.total / maxCategory) * 100}%`, background: colorOf(c.id) }}
                  />
                </span>
              </div>
            ))}
          </StatementRow>
          <TotalRow label="กำไรสุทธิ" amount={s.netProfit} net />
        </CardContent>
      </Card>

      {/* Cash + import lots (information, not part of profit) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4 text-muted-foreground" />
              เงินเข้าจริง / ค้างรับ
            </CardTitle>
            <p className="text-xs text-muted-foreground">ตามใบเสร็จที่รับชำระแล้ว แยกจากกำไรบนกระดาษ</p>
          </CardHeader>
          <CardContent className="space-y-3 tabular-nums">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">เงินเข้าเดือนนี้ (รวม VAT)</p>
                <p className="text-lg font-bold text-green-600">{formatBaht(data.cash.received)}</p>
                <p className="text-xs text-muted-foreground">{data.cash.receipts.length} ใบเสร็จ</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ค้างรับจากบิลเดือนนี้</p>
                <p className={cn("text-lg font-bold", data.cash.outstanding > 0 ? "text-amber-600" : "")}>
                  {formatBaht(data.cash.outstanding)}
                </p>
                <p className="text-xs text-muted-foreground">{owingBills.length} บิลยังเก็บเงินไม่ครบ</p>
              </div>
            </div>
            {data.cash.receipts.length > 0 && (
              <MiniList title="ใบเสร็จที่รับเงินเดือนนี้">
                {data.cash.receipts.map((r) => (
                  <DrillRow
                    key={r.id}
                    href={`/receipts/${r.id}`}
                    label={`${shortDate(r.date)} · ${r.documentNumber ?? "ใบเสร็จ"} · ${r.customerName}`}
                  >
                    {formatBaht(r.amount)}
                  </DrillRow>
                ))}
              </MiniList>
            )}
            {owingBills.length > 0 && (
              <MiniList title="บิลเดือนนี้ที่ยังค้างรับ">
                {owingBills.map((b) => (
                  <DrillRow key={b.id} href={`/quotations/${b.id}`} label={`${billLabel(b)} · ${b.customerName}`}>
                    {formatBaht(b.outstanding)}
                  </DrillRow>
                ))}
              </MiniList>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-muted-foreground" />
              ซื้อสินค้าเข้าล็อต
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              ยังเป็นสต็อก ไม่หักจากกำไรจนกว่าจะขาย (ต้นทุนถึงไทย ตามวันที่สั่งของล็อต)
            </p>
          </CardHeader>
          <CardContent className="space-y-3 tabular-nums">
            <div>
              <p className="text-xs text-muted-foreground">ยอดรวมล็อตเดือนนี้</p>
              <p className="text-lg font-bold">{formatBaht(data.importLots.total)}</p>
              <p className="text-xs text-muted-foreground">{data.importLots.lots.length} ล็อต</p>
            </div>
            {data.importLots.lots.length > 0 ? (
              <MiniList title="ล็อตที่สั่งเดือนนี้">
                {data.importLots.lots.map((l) => (
                  <DrillRow
                    key={l.id}
                    href={`/import-lots/${l.id}`}
                    label={`${shortDate(l.orderDate)} · ${l.name}${l.lotNumber ? ` (${l.lotNumber})` : ""}`}
                  >
                    {formatBaht(l.totalLanded)}
                  </DrillRow>
                ))}
              </MiniList>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีล็อตนำเข้าที่สั่งในเดือนนี้</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <Card>
        <CardContent>
          <Tabs defaultValue="bills">
            <TabsList>
              <TabsTrigger value="bills">บิลที่ขาย ({data.bills.length})</TabsTrigger>
              <TabsTrigger value="expenses">ค่าใช้จ่าย ({data.expenses.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="bills" className="tabular-nums">
              {data.bills.length === 0 ? (
                <Empty>ยังไม่มีบิลที่ขายในเดือนนี้</Empty>
              ) : (
                <div className="divide-y">
                  {data.bills.map((b) => (
                    <BillRow key={b.id} bill={b} />
                  ))}
                </div>
              )}
              <Link
                href={profitReportHref}
                className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground"
              >
                ดูต้นทุนรายบรรทัดในหน้ากำไรต่อบิล ›
              </Link>
            </TabsContent>
            <TabsContent value="expenses" className="tabular-nums">
              {data.expenses.length === 0 ? (
                <Empty>ยังไม่มีค่าใช้จ่ายในเดือนนี้</Empty>
              ) : (
                <div className="divide-y">
                  {data.expenses.map((e) => (
                    <Link
                      key={e.id}
                      href={
                        e.payrollId
                          ? `/payroll/${e.payrollId}/slip`
                          : `/expenses?year=${data.year}&month=${data.month}&edit=${e.id}`
                      }
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2.5 text-sm hover:bg-accent/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{e.name}</span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="size-2 rounded-full" style={{ background: colorOf(e.categoryId) }} />
                          {e.categoryName} · {shortDate(e.date)}
                          {e.payrollId && " · จากสลิปเงินเดือน"}
                        </span>
                      </span>
                      <span className="text-right">{formatBaht(e.amount)}</span>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href={`/expenses?year=${data.year}&month=${data.month}`}
                className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground"
              >
                ไปหน้าค่าใช้จ่ายรายเดือน ›
              </Link>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function StatementRow({
  op,
  label,
  sub,
  amount,
  className,
  defaultOpen,
  children,
}: {
  op?: string;
  label: string;
  sub?: string;
  amount: number;
  className?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  const line = (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto_1rem] items-center gap-2 py-3">
      <span className="text-center font-semibold text-muted-foreground">{op}</span>
      <span className="min-w-0">
        <span className="block">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <span className={cn("font-semibold", className)}>{formatBaht(amount)}</span>
      {items.length > 0 ? (
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
      ) : (
        <span />
      )}
    </div>
  );
  if (items.length === 0) return <div className="border-b">{line}</div>;
  return (
    <details className="group border-b" open={defaultOpen}>
      <summary className="cursor-pointer list-none rounded-md hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
        {line}
      </summary>
      <div className="space-y-2 pb-3 pl-7">{items}</div>
    </details>
  );
}

function TotalRow({ label, sub, amount, net }: { label: string; sub?: string; amount: number; net?: boolean }) {
  const positive = amount >= 0;
  return (
    <div
      className={cn(
        "my-2 grid grid-cols-[1.25rem_minmax(0,1fr)_auto_1rem] items-center gap-2 rounded-lg px-1 py-3",
        net
          ? positive
            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          : "bg-muted"
      )}
    >
      <span className="text-center font-semibold">=</span>
      <span className={cn("min-w-0", net && "font-bold")}>
        {label}
        {sub && <span className="block text-xs font-normal text-muted-foreground">{sub}</span>}
      </span>
      <span className={cn("text-lg font-bold", !net && !positive && "text-red-600")}>{formatBaht(amount)}</span>
      <span />
    </div>
  );
}

function DrillRow({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 text-sm hover:underline">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className="shrink-0">{children}</span>
    </Link>
  );
}

function MiniList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-md border px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">{children}</div>
    </details>
  );
}

function BillRow({ bill: b }: { bill: MonthBill }) {
  return (
    <Link
      href={`/quotations/${b.id}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2.5 text-sm hover:bg-accent/40"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{billLabel(b)}</span>
          {b.missingCostLines > 0 && (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              ไม่มีต้นทุน
            </Badge>
          )}
          {b.outstanding > 0 && (
            <Badge variant="outline" className="text-muted-foreground">
              ค้างรับ {formatBaht(b.outstanding)}
            </Badge>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {b.customerName} · {formatThaiDateShort(new Date(b.documentDate))}
        </span>
      </span>
      <span className="text-right">
        <span className="block">{formatBaht(b.revenue)}</span>
        {b.profit == null ? (
          <span className="text-xs text-muted-foreground">ต้นทุนจากใบสั่งซื้อเดิม</span>
        ) : (
          <span className="flex items-center justify-end gap-1.5 text-xs">
            <span className={b.profit >= 0 ? "text-green-600" : "text-red-600"}>กำไร {formatBaht(b.profit)}</span>
            <MarginBadge percent={b.marginPercent} />
          </span>
        )}
      </span>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
