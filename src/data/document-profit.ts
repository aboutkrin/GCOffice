import "server-only";

import { prisma } from "@/lib/prisma";
import { getLandedCostIndex, resolveLineCost, type CostSource } from "@/data/import-lots";

export interface DocumentProfitLine {
  id: string;
  productSku: string | null;
  productName: string;
  colorVariantName: string | null;
  colorVariantSku: string | null;
  productId: string | null;
  colorVariantId: string | null;
  quantity: number;
  lineTotal: number;
  unitCost: number | null;
  /** Cost the system would use without a manual entry (shown as placeholder) */
  suggestedCost: number | null;
  suggestedSource: CostSource;
  /** Today's average from import lots, ignoring the cost locked at confirmation */
  averageCost: number | null;
  /** Cost locked when the quotation was confirmed (null = not locked) */
  costSnapshot: number | null;
  source: CostSource;
  manual: boolean;
}

export interface DocumentProfit {
  documentId: string;
  /** Confirmed/shipped quotation: its costs are locked (see lockDocumentLineCosts) */
  sold: boolean;
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
  type: string;
  status: string;
  grandTotal: unknown;
  vatAmount: unknown;
  actualDeliveryCost: unknown;
  lineItems: {
    id: string;
    productSku: string | null;
    productName: string;
    colorVariantName: string | null;
    colorVariantSku: string | null;
    productId: string | null;
    colorVariantId: string | null;
    quantity: number;
    lineTotal: unknown;
    unitCost: unknown;
    costSnapshot: unknown;
  }[];
};

export const PROFIT_DOC_SELECT = {
  id: true,
  type: true,
  status: true,
  grandTotal: true,
  vatAmount: true,
  actualDeliveryCost: true,
  lineItems: {
    orderBy: { sequence: "asc" as const },
    select: {
      id: true,
      productSku: true,
      productName: true,
      colorVariantName: true,
      colorVariantSku: true,
      productId: true,
      colorVariantId: true,
      quantity: true,
      lineTotal: true,
      unitCost: true,
      costSnapshot: true,
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
      const average = resolveLineCost({ ...l, unitCost: null, costSnapshot: null }, index);
      return {
        id: l.id,
        productSku: l.productSku,
        productName: l.productName,
        colorVariantName: l.colorVariantName,
        colorVariantSku: l.colorVariantSku,
        productId: l.productId,
        colorVariantId: l.colorVariantId,
        quantity: l.quantity,
        lineTotal: Number(l.lineTotal),
        unitCost: resolved.unitCost,
        suggestedCost: suggested.unitCost,
        suggestedSource: suggested.source,
        averageCost: average.unitCost,
        costSnapshot: l.costSnapshot != null ? Number(l.costSnapshot) : null,
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
      sold: doc.type === "QUOTATION" && (doc.status === "CONFIRMED" || doc.status === "SHIPPED"),
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

/**
 * Lock today's average landed cost into `costSnapshot` so a later import lot
 * doesn't change the profit of a bill already sold. Called when a quotation is
 * confirmed (only lines without a snapshot) and by the profit card's
 * "recalculate" button (`overwrite`). Lines with no known cost stay null.
 */
export async function lockDocumentLineCosts(documentId: string, options?: { overwrite?: boolean }) {
  const lines = await prisma.documentLineItem.findMany({
    where: { documentId, ...(options?.overwrite ? {} : { costSnapshot: null }) },
    select: { id: true, productId: true, colorVariantId: true },
  });
  if (lines.length === 0) return;
  const index = await getLandedCostIndex(lines.map((l) => l.productId).filter((x): x is string => !!x));
  await prisma.$transaction(
    lines.map((l) =>
      prisma.documentLineItem.update({
        where: { id: l.id },
        data: { costSnapshot: resolveLineCost({ ...l, unitCost: null, costSnapshot: null }, index).unitCost },
      })
    )
  );
}

/** Back to draft/quoted: the bill isn't sold any more, so follow the average again. */
export async function clearDocumentLineCosts(documentId: string) {
  await prisma.documentLineItem.updateMany({ where: { documentId }, data: { costSnapshot: null } });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
