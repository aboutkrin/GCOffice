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
