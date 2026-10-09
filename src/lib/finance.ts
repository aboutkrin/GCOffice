/**
 * Monthly profit-and-loss math shared by the dashboard chart and the month page
 * (`src/data/finance.ts`). Pure so it can be unit-tested (tests/finance.test.ts).
 */

export interface FinanceTotals {
  /** grandTotal − VAT of the sold quotations (includes shipping charged) */
  revenue: number;
  vat: number;
  /** Landed cost of the goods sold (import lots) */
  cogs: number;
  /** What we paid to deliver (Document.actualDeliveryCost) */
  deliveryCost: number;
  /** Old ต้นทุนใบสั่งซื้อ rows (vendor_costs), by their order date */
  legacyVendorCost: number;
  /** Monthly expenses (/expenses, payroll included) */
  operatingExpense: number;
}

export interface FinanceSummary extends FinanceTotals {
  /** cogs + deliveryCost + legacyVendorCost */
  productCost: number;
  grossProfit: number;
  netProfit: number;
  /** netProfit as % of revenue (0 when there is no revenue) */
  marginPercent: number;
  grossMarginPercent: number;
}

export const EMPTY_TOTALS: FinanceTotals = {
  revenue: 0,
  vat: 0,
  cogs: 0,
  deliveryCost: 0,
  legacyVendorCost: 0,
  operatingExpense: 0,
};

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function summarizeFinance(t: FinanceTotals): FinanceSummary {
  const productCost = round2(t.cogs + t.deliveryCost + t.legacyVendorCost);
  const grossProfit = round2(t.revenue - productCost);
  const netProfit = round2(grossProfit - t.operatingExpense);
  return {
    ...t,
    productCost,
    grossProfit,
    netProfit,
    marginPercent: t.revenue > 0 ? round2((netProfit / t.revenue) * 100) : 0,
    grossMarginPercent: t.revenue > 0 ? round2((grossProfit / t.revenue) * 100) : 0,
  };
}

export function addTotals(a: FinanceTotals, b: FinanceTotals): FinanceTotals {
  return {
    revenue: round2(a.revenue + b.revenue),
    vat: round2(a.vat + b.vat),
    cogs: round2(a.cogs + b.cogs),
    deliveryCost: round2(a.deliveryCost + b.deliveryCost),
    legacyVendorCost: round2(a.legacyVendorCost + b.legacyVendorCost),
    operatingExpense: round2(a.operatingExpense + b.operatingExpense),
  };
}

/** % change from `previous` to `current`; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/** What a customer still owes on a bill after the receipts paid so far (never below 0). */
export function outstandingAmount(grandTotal: number, received: number[]): number {
  const paid = received.reduce((s, r) => s + r, 0);
  return Math.max(0, round2(grandTotal - paid));
}

/** "YYYY-MM" key for a UTC date (DATE columns are stored as UTC midnight/noon). */
export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** The month page (/dashboard/finance/[year]/[month]) */
export function financeMonthHref(year: number, month: number) {
  return `/dashboard/finance/${year}/${month}`;
}
