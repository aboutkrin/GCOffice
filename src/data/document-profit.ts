import "server-only";

import { prisma } from "@/lib/prisma";
import { getLandedCostIndex, resolveLineCost, type CostSource } from "@/data/import-lots";

export interface DocumentProfitLine {
  id: string;
  productName: string;
  colorVariantName: string | null;
  quantity: number;
  lineTotal: number;
  unitCost: number | null;
  /** Cost the system would use without a manual entry (shown as placeholder) */
  suggestedCost: number | null;
  suggestedSource: CostSource;
  source: CostSource;
  manual: boolean;
}

export interface DocumentProfit {
  documentId: string;
  /** grandTotal − VAT (includes the shipping charged to the customer) */
  revenue: number;
  cogs: number;
  actualDeliveryCost: number;
  profit: number;
  marginPercent: number;
  missingCostLines: number;
  lines: DocumentProfitLine[];
}

type DocForProfit = {
  id: string;
  grandTotal: unknown;
  vatAmount: unknown;
  actualDeliveryCost: unknown;
  lineItems: {
    id: string;
    productName: string;
    colorVariantName: string | null;
    productId: string | null;
    colorVariantId: string | null;
    quantity: number;
    lineTotal: unknown;
    unitCost: unknown;
  }[];
};

export const PROFIT_DOC_SELECT = {
  id: true,
  grandTotal: true,
  vatAmount: true,
  actualDeliveryCost: true,
  lineItems: {
    orderBy: { sequence: "asc" as const },
    select: {
      id: true,
      productName: true,
      colorVariantName: true,
      productId: true,
      colorVariantId: true,
      quantity: true,
      lineTotal: true,
      unitCost: true,
    },
  },
};

/** Profit for many documents with one landed-cost lookup (dashboard). */
export async function computeDocumentProfits(docs: DocForProfit[]): Promise<DocumentProfit[]> {
  const index = await getLandedCostIndex(
    docs.flatMap((d) => d.lineItems.map((l) => l.productId).filter((x): x is string => !!x))
  );

  return docs.map((doc) => {
    const lines: DocumentProfitLine[] = doc.lineItems.map((l) => {
      const resolved = resolveLineCost(l, index);
      const suggested = resolveLineCost({ ...l, unitCost: null }, index);
      return {
        id: l.id,
        productName: l.productName,
        colorVariantName: l.colorVariantName,
        quantity: l.quantity,
        lineTotal: Number(l.lineTotal),
        unitCost: resolved.unitCost,
        suggestedCost: suggested.unitCost,
        suggestedSource: suggested.source,
        source: resolved.source,
        manual: resolved.source === "manual",
      };
    });
    const revenue = Number(doc.grandTotal) - Number(doc.vatAmount);
    const cogs = round2(lines.reduce((s, l) => s + (l.unitCost ?? 0) * l.quantity, 0));
    const actualDeliveryCost = Number(doc.actualDeliveryCost ?? 0);
    const profit = round2(revenue - cogs - actualDeliveryCost);
    return {
      documentId: doc.id,
      revenue: round2(revenue),
      cogs,
      actualDeliveryCost,
      profit,
      marginPercent: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      missingCostLines: lines.filter((l) => l.unitCost == null).length,
      lines,
    };
  });
}

export async function getDocumentProfit(documentId: string): Promise<DocumentProfit | null> {
  const doc = await prisma.document.findUnique({ where: { id: documentId }, select: PROFIT_DOC_SELECT });
  if (!doc) return null;
  const [profit] = await computeDocumentProfits([doc]);
  return profit;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
