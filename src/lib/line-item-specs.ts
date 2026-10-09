/**
 * Prisma include for document line items that also pulls the product's
 * website tile facts, so previews can print "1 กล่อง สามารถปูได้ … ตร.ม.".
 */
export const lineItemsWithSpecsInclude = {
  orderBy: { sequence: "asc" as const },
  include: { product: { select: { websiteSpecs: true } } },
};

type Specs = {
  sqmPerUnit?: string | null;
  unitLabel?: string | null;
  tileSize?: string | null;
  piecesPerUnit?: number | null;
};

/**
 * m² per box: the website's `sqmPerUnit`, else tile size × pieces per box
 * ("100 x 100 mm", 100 pieces → "1"). Sizes without a unit are read as mm.
 */
export function sqmPerUnitOf(specs: Specs | null): string | null {
  const direct = specs?.sqmPerUnit ? Number(specs.sqmPerUnit) : NaN;
  if (Number.isFinite(direct) && direct > 0) return String(direct);

  const pieces = specs?.piecesPerUnit ?? 0;
  const size = specs?.tileSize?.toLowerCase().replace(/,/g, "") ?? "";
  const match = size.match(/([\d.]+)\s*[x×*]\s*([\d.]+)\s*(mm|cm|m)?/);
  if (!match || !(pieces > 0)) return null;
  const toMetres = { mm: 0.001, cm: 0.01, m: 1 }[match[3] ?? "mm"] ?? 0.001;
  const sqm = Number(match[1]) * toMetres * Number(match[2]) * toMetres * pieces;
  return Number.isFinite(sqm) && sqm > 0 ? sqm.toFixed(4) : null;
}

type WithProductSpecs = { product?: { websiteSpecs: unknown } | null };

/** Replaces the joined `product` with flat `sqmPerUnit` / `unitLabel` fields. */
export function flattenLineItemSpecs<T extends WithProductSpecs>(items: T[]) {
  return items.map(({ product, ...item }) => {
    const specs = (product?.websiteSpecs ?? null) as Specs | null;
    return {
      ...item,
      sqmPerUnit: sqmPerUnitOf(specs),
      unitLabel: specs?.unitLabel ?? null,
    };
  });
}
