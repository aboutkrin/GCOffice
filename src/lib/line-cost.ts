// Pure cost-per-unit resolution for sold lines (kept free of Prisma so it can be unit-tested).

export interface LandedCostIndex {
  byVariant: Record<string, number>;
  byProduct: Record<string, number>;
  /** Old per-product cost fields (ต้นทุนสินค้า page), used when no lot exists */
  legacy: Record<string, number>;
}

export type CostSource = "manual" | "snapshot" | "variant" | "product" | "legacy" | "none";

/**
 * Cost per unit of a sold line: manual entry → cost locked when the quotation
 * was confirmed → average landed cost of the colour → of the product → legacy.
 */
export function resolveLineCost(
  line: { unitCost?: unknown; costSnapshot?: unknown; productId?: string | null; colorVariantId?: string | null },
  index: LandedCostIndex
): { unitCost: number | null; source: CostSource } {
  if (line.unitCost != null && line.unitCost !== "") {
    return { unitCost: Number(line.unitCost), source: "manual" };
  }
  if (line.costSnapshot != null && line.costSnapshot !== "") {
    return { unitCost: Number(line.costSnapshot), source: "snapshot" };
  }
  if (line.colorVariantId && index.byVariant[line.colorVariantId] != null) {
    return { unitCost: index.byVariant[line.colorVariantId], source: "variant" };
  }
  if (line.productId && index.byProduct[line.productId] != null) {
    return { unitCost: index.byProduct[line.productId], source: "product" };
  }
  if (line.productId && index.legacy[line.productId] != null) {
    return { unitCost: index.legacy[line.productId], source: "legacy" };
  }
  return { unitCost: null, source: "none" };
}

export interface LotCostPart {
  boxes: number;
  landedPerBox: number;
}

/** Cost per unit of a line whose boxes came from several lots: Σ(boxes × landed) ÷ Σboxes. */
export function blendLotCost(parts: LotCostPart[]): number | null {
  const boxes = parts.reduce((s, p) => s + p.boxes, 0);
  if (!parts.length || boxes <= 0 || parts.some((p) => !(p.boxes > 0) || !(p.landedPerBox >= 0))) return null;
  const total = parts.reduce((s, p) => s + p.boxes * p.landedPerBox, 0);
  return Math.round((total / boxes) * 100) / 100;
}

/** One lot a line's boxes came from, as stored in `DocumentLineItem.costBreakdown`. */
export interface CostBreakdownPart extends LotCostPart {
  lotItemId: string;
  /** e.g. "ล็อต 0018 · YC89" */
  lotLabel: string;
  supplierCode: string;
}

/** Read the stored JSON back, dropping anything malformed. */
export function parseCostBreakdown(value: unknown): CostBreakdownPart[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const o = v as Record<string, unknown>;
    const boxes = Number(o.boxes);
    const landedPerBox = Number(o.landedPerBox);
    if (!(boxes > 0) || !(landedPerBox >= 0)) return [];
    return [{
      lotItemId: String(o.lotItemId ?? ""),
      lotLabel: String(o.lotLabel ?? ""),
      supplierCode: String(o.supplierCode ?? ""),
      boxes,
      landedPerBox,
    }];
  });
}

/** "ล็อต 0018 ×5 · ล็อต 0012 ×1" */
export function formatCostBreakdown(parts: CostBreakdownPart[]): string {
  return parts.map((p) => `${p.lotLabel.split(" · ")[0]} ×${p.boxes.toLocaleString("th-TH")}`).join(" · ");
}
