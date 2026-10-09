import "server-only";

import { prisma } from "@/lib/prisma";
import { computeDocumentProfits, PROFIT_DOC_SELECT, type DocumentProfit } from "@/data/document-profit";
import { getLandedCostIndex } from "@/data/import-lots";
import { resolveLineCost } from "@/lib/line-cost";

export interface ProfitReportRow extends DocumentProfit {
  documentNumber: string | null;
  documentDate: string;
  customerName: string;
  status: string;
}

export interface ProfitReport {
  rows: ProfitReportRow[];
  totals: {
    revenue: number;
    cogs: number;
    actualDeliveryCost: number;
    profit: number;
    marginPercent: number;
    billsMissingCost: number;
  };
  /** Bills costed on the old ต้นทุนใบสั่งซื้อ page, left out like on the dashboard */
  legacyCostedBills: number;
}

/**
 * Profit per sold bill for a month (or a whole year when `month` is omitted).
 * Same bills and dates the dashboard counts as revenue / cost of sales.
 */
export async function getProfitReport(params: { year: number; month?: number }): Promise<ProfitReport> {
  const { year, month } = params;
  const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const to = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));
  const sold = {
    type: "QUOTATION" as const,
    status: { in: ["CONFIRMED" as const, "SHIPPED" as const, "BILLED" as const] },
    documentDate: { gte: from, lt: to },
  };

  const [docs, legacyCostedBills] = await Promise.all([
    prisma.document.findMany({
      where: {
        ...sold,
        vendorCosts: { none: {} },
        invoices: { none: { vendorCosts: { some: {} } } },
      },
      orderBy: [{ documentDate: "desc" }, { documentNumber: "desc" }],
      select: { ...PROFIT_DOC_SELECT, documentNumber: true, documentDate: true, customerSnapshot: true },
    }),
    prisma.document.count({
      where: {
        ...sold,
        OR: [{ vendorCosts: { some: {} } }, { invoices: { some: { vendorCosts: { some: {} } } } }],
      },
    }),
  ]);

  const profits = await computeDocumentProfits(docs);
  const rows: ProfitReportRow[] = docs.map((doc, i) => {
    const snapshot = (doc.customerSnapshot ?? {}) as Record<string, unknown>;
    return {
      ...profits[i],
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate.toISOString(),
      customerName: (snapshot.customerName as string) || (snapshot.companyName as string) || "-",
      status: doc.status,
    };
  });

  const revenue = round2(rows.reduce((s, r) => s + r.revenue, 0));
  const cogs = round2(rows.reduce((s, r) => s + r.cogs, 0));
  const actualDeliveryCost = round2(rows.reduce((s, r) => s + r.actualDeliveryCost, 0));
  const profit = round2(revenue - cogs - actualDeliveryCost);

  return {
    rows,
    totals: {
      revenue,
      cogs,
      actualDeliveryCost,
      profit,
      marginPercent: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      billsMissingCost: rows.filter((r) => r.missingCostLines > 0).length,
    },
    legacyCostedBills,
  };
}

/**
 * What the boxes on hand cost us (average landed cost × stock): the import
 * lots not sold yet. Colour variants carry the stock once a product has any.
 */
export async function getInventoryValue() {
  const products = await prisma.product.findMany({
    where: {
      OR: [{ stockQuantity: { gt: 0 } }, { colorVariants: { some: { stockQuantity: { gt: 0 } } } }],
    },
    select: {
      id: true,
      stockQuantity: true,
      colorVariants: { select: { id: true, stockQuantity: true } },
    },
  });
  const index = await getLandedCostIndex(products.map((p) => p.id));

  let value = 0;
  let boxes = 0;
  let boxesWithoutCost = 0;
  const add = (qty: number, cost: number | null) => {
    if (qty <= 0) return;
    boxes += qty;
    if (cost == null) boxesWithoutCost += qty;
    else value += qty * cost;
  };
  for (const p of products) {
    if (p.colorVariants.length > 0) {
      for (const v of p.colorVariants) {
        add(v.stockQuantity, resolveLineCost({ productId: p.id, colorVariantId: v.id }, index).unitCost);
      }
    } else {
      add(p.stockQuantity, resolveLineCost({ productId: p.id }, index).unitCost);
    }
  }

  return { value: round2(value), boxes, boxesWithoutCost };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
