/**
 * Prisma include for document line items that also pulls the product's
 * website tile facts, so previews can print "1 กล่อง สามารถปูได้ … ตร.ม.".
 */
export const lineItemsWithSpecsInclude = {
  orderBy: { sequence: "asc" as const },
  include: { product: { select: { websiteSpecs: true } } },
};

type WithProductSpecs = { product?: { websiteSpecs: unknown } | null };

/** Replaces the joined `product` with flat `sqmPerUnit` / `unitLabel` fields. */
export function flattenLineItemSpecs<T extends WithProductSpecs>(items: T[]) {
  return items.map(({ product, ...item }) => {
    const specs = (product?.websiteSpecs ?? null) as
      | { sqmPerUnit?: string | null; unitLabel?: string | null }
      | null;
    return {
      ...item,
      sqmPerUnit: specs?.sqmPerUnit ?? null,
      unitLabel: specs?.unitLabel ?? null,
    };
  });
}
