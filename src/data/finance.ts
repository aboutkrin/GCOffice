import "server-only";

import { prisma } from "@/lib/prisma";
import { computeDocumentProfits, PROFIT_DOC_SELECT } from "@/data/document-profit";
import { getExpenseCategories } from "@/data/expenses";
import {
  EMPTY_TOTALS,
  monthKey,
  outstandingAmount,
  round2,
  shiftMonth,
  summarizeFinance,
  type FinanceSummary,
  type FinanceTotals,
} from "@/lib/finance";

/**
 * Revenue = sold quotations (CONFIRMED / SHIPPED / BILLED) by their document
 * date, grandTotal − VAT. Cost of sales = landed cost + actual delivery of
 * those bills, except bills covered by a legacy vendor_costs row (that row is
 * counted instead, by its order date). Operating expense = /expenses rows.
 */
const SOLD_STATUSES = ["CONFIRMED", "SHIPPED", "BILLED"] as const;

type Row = { year: number; month: number; total: number };

function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Totals per "YYYY-MM" for every month in [from, to). */
export async function getFinanceTotalsByMonth(from: Date, to: Date): Promise<Map<string, FinanceTotals>> {
  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);

  const [sales, expenses, vendorCosts, costOfSales] = await Promise.all([
    safe(
      prisma.$queryRaw<{ year: number; month: number; revenue: number; vat: number }[]>`
        SELECT EXTRACT(YEAR FROM document_date)::int AS year,
               EXTRACT(MONTH FROM document_date)::int AS month,
               COALESCE(SUM(grand_total - vat_amount), 0)::float8 AS revenue,
               COALESCE(SUM(vat_amount), 0)::float8 AS vat
        FROM documents
        WHERE type = 'QUOTATION'
          AND status IN ('CONFIRMED', 'SHIPPED', 'BILLED')
          AND document_date >= ${from} AND document_date < ${to}
        GROUP BY 1, 2
      `
    ),
    safe(
      prisma.$queryRaw<Row[]>`
        SELECT EXTRACT(YEAR FROM expense_date)::int AS year,
               EXTRACT(MONTH FROM expense_date)::int AS month,
               COALESCE(SUM(amount), 0)::float8 AS total
        FROM expenses
        WHERE expense_date >= ${from} AND expense_date < ${to}
        GROUP BY 1, 2
      `
    ),
    safe(
      prisma.$queryRaw<Row[]>`
        SELECT EXTRACT(YEAR FROM order_date)::int AS year,
               EXTRACT(MONTH FROM order_date)::int AS month,
               COALESCE(SUM(total_cost), 0)::float8 AS total
        FROM vendor_costs
        WHERE order_date >= ${from} AND order_date < ${to}
        GROUP BY 1, 2
      `
    ),
    getCostOfSales(from, to).catch(() => [] as { key: string; cogs: number; deliveryCost: number }[]),
  ]);

  const map = new Map<string, FinanceTotals>();
  const get = (key: string) => {
    let t = map.get(key);
    if (!t) map.set(key, (t = { ...EMPTY_TOTALS }));
    return t;
  };
  for (const r of sales) {
    const t = get(monthKey(r.year, r.month));
    t.revenue = round2(r.revenue);
    t.vat = round2(r.vat);
  }
  for (const r of expenses) get(monthKey(r.year, r.month)).operatingExpense = round2(r.total);
  for (const r of vendorCosts) get(monthKey(r.year, r.month)).legacyVendorCost = round2(r.total);
  for (const r of costOfSales) {
    const t = get(r.key);
    t.cogs = round2(r.cogs);
    t.deliveryCost = round2(r.deliveryCost);
  }
  return map;
}

async function getCostOfSales(from: Date, to: Date) {
  const docs = await prisma.document.findMany({
    where: {
      type: "QUOTATION",
      status: { in: [...SOLD_STATUSES] },
      documentDate: { gte: from, lt: to },
      vendorCosts: { none: {} },
      invoices: { none: { vendorCosts: { some: {} } } },
    },
    select: { ...PROFIT_DOC_SELECT, documentDate: true },
  });
  const profits = await computeDocumentProfits(docs);
  const byMonth = new Map<string, { cogs: number; deliveryCost: number }>();
  docs.forEach((doc, i) => {
    const key = monthKey(doc.documentDate.getUTCFullYear(), doc.documentDate.getUTCMonth() + 1);
    const m = byMonth.get(key) ?? { cogs: 0, deliveryCost: 0 };
    m.cogs += profits[i].cogs;
    m.deliveryCost += profits[i].actualDeliveryCost;
    byMonth.set(key, m);
  });
  return [...byMonth].map(([key, v]) => ({ key, ...v }));
}

/** 12 months of a year, January first. */
export async function getFinanceYear(year: number): Promise<FinanceSummary[]> {
  const map = await getFinanceTotalsByMonth(monthStart(year, 1), monthStart(year + 1, 1));
  return Array.from({ length: 12 }, (_, i) => summarizeFinance(map.get(monthKey(year, i + 1)) ?? EMPTY_TOTALS));
}

// ---------------------------------------------------------------------------
// Month page

export interface MonthBill {
  id: string;
  documentNumber: string | null;
  documentDate: string;
  customerName: string;
  status: string;
  grandTotal: number;
  revenue: number;
  cogs: number;
  deliveryCost: number;
  /** null for bills costed on the old vendor_costs page */
  profit: number | null;
  marginPercent: number;
  missingCostLines: number;
  legacy: boolean;
  received: number;
  outstanding: number;
}

export interface MonthExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  categoryId: string;
  categoryName: string;
  payrollId: string | null;
}

export interface MonthExpenseCategory {
  id: string;
  name: string;
  total: number;
  count: number;
}

export interface MonthReceipt {
  id: string;
  documentNumber: string | null;
  date: string;
  customerName: string;
  amount: number;
  invoiceNumber: string | null;
}

export interface MonthImportLot {
  id: string;
  name: string;
  lotNumber: string | null;
  orderDate: string;
  totalLanded: number;
}

export interface MonthFinance {
  year: number;
  month: number;
  summary: FinanceSummary;
  previous: FinanceSummary & { year: number; month: number };
  bills: MonthBill[];
  billsMissingCost: number;
  legacyBills: number;
  expenses: MonthExpense[];
  expenseCategories: MonthExpenseCategory[];
  /** All active categories in sortOrder, for the same colours as /expenses */
  categoryOrder: { id: string; name: string }[];
  cash: {
    received: number;
    receipts: MonthReceipt[];
    outstanding: number;
  };
  importLots: { total: number; lots: MonthImportLot[] };
}

function customerNameOf(snapshot: unknown) {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  return (s.customerName as string) || (s.companyName as string) || "-";
}

export async function getMonthFinance(year: number, month: number): Promise<MonthFinance> {
  const from = monthStart(year, month);
  const to = monthStart(year, month + 1);
  const prev = shiftMonth(year, month, -1);

  const [totals, docs, expenseRows, categories, receiptRows, lotRows] = await Promise.all([
    getFinanceTotalsByMonth(monthStart(prev.year, prev.month), to),
    prisma.document.findMany({
      where: { type: "QUOTATION", status: { in: [...SOLD_STATUSES] }, documentDate: { gte: from, lt: to } },
      orderBy: [{ documentDate: "desc" }, { documentNumber: "desc" }],
      select: {
        ...PROFIT_DOC_SELECT,
        documentNumber: true,
        documentDate: true,
        customerSnapshot: true,
        vendorCosts: { select: { id: true }, take: 1 },
        invoices: {
          select: {
            status: true,
            vendorCosts: { select: { id: true }, take: 1 },
            receipts: { where: { type: "RECEIPT", status: "PAID" }, select: { netPayable: true } },
          },
        },
      },
    }),
    prisma.expense
      .findMany({
        where: { expenseDate: { gte: from, lt: to } },
        include: { category: { select: { id: true, name: true } }, payroll: { select: { id: true } } },
        orderBy: [{ expenseDate: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
    getExpenseCategories(),
    prisma.document.findMany({
      where: {
        type: "RECEIPT",
        status: "PAID",
        OR: [
          { paymentDate: { gte: from, lt: to } },
          { paymentDate: null, documentDate: { gte: from, lt: to } },
        ],
      },
      orderBy: [{ paymentDate: "asc" }, { documentDate: "asc" }],
      select: {
        id: true,
        documentNumber: true,
        documentDate: true,
        paymentDate: true,
        netPayable: true,
        customerSnapshot: true,
        sourceInvoice: { select: { documentNumber: true } },
      },
    }),
    prisma.importLot
      .findMany({
        where: { orderDate: { gte: from, lt: to } },
        orderBy: { orderDate: "asc" },
        select: { id: true, name: true, lotNumber: true, orderDate: true, totalLanded: true },
      })
      .catch(() => []),
  ]);

  const isLegacy = (d: (typeof docs)[number]) =>
    d.vendorCosts.length > 0 || d.invoices.some((i) => i.vendorCosts.length > 0);
  const costed = docs.filter((d) => !isLegacy(d));
  const profits = new Map((await computeDocumentProfits(costed)).map((p) => [p.documentId, p]));

  const bills: MonthBill[] = docs.map((d) => {
    const p = profits.get(d.id);
    const grandTotal = Number(d.grandTotal);
    const received = d.invoices
      .filter((i) => i.status !== "CANCELLED")
      .flatMap((i) => i.receipts.map((r) => Number(r.netPayable)));
    return {
      id: d.id,
      documentNumber: d.documentNumber,
      documentDate: d.documentDate.toISOString(),
      customerName: customerNameOf(d.customerSnapshot),
      status: d.status,
      grandTotal,
      revenue: round2(grandTotal - Number(d.vatAmount)),
      cogs: p?.cogs ?? 0,
      deliveryCost: p?.actualDeliveryCost ?? 0,
      profit: p ? p.profit : null,
      marginPercent: p?.marginPercent ?? 0,
      missingCostLines: p?.missingCostLines ?? 0,
      legacy: !p,
      received: round2(received.reduce((s, r) => s + r, 0)),
      outstanding: outstandingAmount(grandTotal, received),
    };
  });

  const expenses: MonthExpense[] = expenseRows.map((e) => ({
    id: e.id,
    name: e.name,
    amount: Number(e.amount),
    date: e.expenseDate.toISOString(),
    categoryId: e.categoryId,
    categoryName: e.category?.name ?? "-",
    payrollId: e.payroll?.id ?? null,
  }));
  const byCategory = new Map<string, MonthExpenseCategory>();
  for (const e of expenses) {
    const c = byCategory.get(e.categoryId) ?? { id: e.categoryId, name: e.categoryName, total: 0, count: 0 };
    c.total = round2(c.total + e.amount);
    c.count += 1;
    byCategory.set(e.categoryId, c);
  }

  const receipts: MonthReceipt[] = receiptRows.map((r) => ({
    id: r.id,
    documentNumber: r.documentNumber,
    date: (r.paymentDate ?? r.documentDate).toISOString(),
    customerName: customerNameOf(r.customerSnapshot),
    amount: Number(r.netPayable),
    invoiceNumber: r.sourceInvoice?.documentNumber ?? null,
  }));

  const lots: MonthImportLot[] = lotRows.map((l) => ({
    id: l.id,
    name: l.name,
    lotNumber: l.lotNumber,
    orderDate: l.orderDate.toISOString(),
    totalLanded: Number(l.totalLanded),
  }));

  return {
    year,
    month,
    summary: summarizeFinance(totals.get(monthKey(year, month)) ?? EMPTY_TOTALS),
    previous: {
      ...summarizeFinance(totals.get(monthKey(prev.year, prev.month)) ?? EMPTY_TOTALS),
      ...prev,
    },
    bills,
    billsMissingCost: bills.filter((b) => b.missingCostLines > 0).length,
    legacyBills: bills.filter((b) => b.legacy).length,
    expenses,
    expenseCategories: [...byCategory.values()].sort((a, b) => b.total - a.total),
    categoryOrder: (categories as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })),
    cash: {
      received: round2(receipts.reduce((s, r) => s + r.amount, 0)),
      receipts,
      outstanding: round2(bills.reduce((s, b) => s + b.outstanding, 0)),
    },
    importLots: { total: round2(lots.reduce((s, l) => s + l.totalLanded, 0)), lots },
  };
}
