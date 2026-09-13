import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * The single source of truth for "how much of this can I sell right now".
 *
 * Reserved is derived on read, never stored — every stored alternative needs
 * write hooks on independent event classes (document create/update/status,
 * line edit, issue post, issue cancel), each a drift source. Derived has one
 * definition and is automatically correct for DRAFT<->CONFIRMED flapping.
 *
 * These functions are allowed to throw. The rest of the data layer (src/data/*)
 * swallows errors into empty fallbacks; doing that here would mean
 * `reserved = 0`, i.e. silently overselling. Callers must handle rejection.
 */

export interface StockShortage {
  productSku: string;
  productName: string;
  colorVariantName: string | null;
  requested: number;
  available: number;
  shortage: number;
}

export interface UnmatchedLine {
  productSku: string | null;
  productName: string;
}

export interface Availability {
  productId: string;
  colorVariantId: string | null;
  onHand: number;
  reserved: number;
  available: number;
}

export function availabilityKey(
  productId: string,
  colorVariantId: string | null | undefined
): string {
  return `${productId}::${colorVariantId ?? "_"}`;
}

/**
 * Reserved quantity per (productId, colorVariantId), derived from CONFIRMED/
 * SHIPPED quotations that opted into reservation (reservesStock), net of
 * whatever has already been physically issued against each line.
 *
 * Only QUOTATION documents reserve. An invoice created from a quotation
 * (sourceQuotationId) would otherwise double-count, and in this app every
 * invoice comes from a quotation, so quotations alone are the reserving
 * authority. (Known gap: a standalone invoice with no source quotation
 * reserves nothing — if that ever matters, add one more OR branch here
 * rather than including invoices wholesale.)
 */
export async function getReservationMap(
  productIds?: string[]
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<
    { productId: string; colorVariantId: string | null; reserved: number }[]
  >(Prisma.sql`
    SELECT product_id AS "productId", color_variant_id AS "colorVariantId", SUM(reserved)::int AS reserved
    FROM (
      SELECT li.product_id, li.color_variant_id, d.id AS doc_id,
             GREATEST(0, SUM(li.quantity) - COALESCE(MAX(iss.issued), 0)) AS reserved
      FROM document_line_items li
      JOIN documents d ON d.id = li.document_id
      LEFT JOIN (
        SELECT sdl.source_line_item_id, SUM(sdl.quantity) AS issued
        FROM stock_document_lines sdl
        JOIN stock_documents sd ON sd.id = sdl.stock_document_id
        WHERE sd.type = 'ISSUE' AND sd.status = 'POSTED'
        GROUP BY sdl.source_line_item_id
      ) iss ON iss.source_line_item_id = li.id
      WHERE d.type = 'QUOTATION'
        AND d.reserves_stock
        AND d.status IN ('CONFIRMED', 'SHIPPED')
        AND li.product_id IS NOT NULL
        ${productIds && productIds.length > 0 ? Prisma.sql`AND li.product_id IN (${Prisma.join(productIds)})` : Prisma.empty}
      GROUP BY li.product_id, li.color_variant_id, d.id
    ) per_doc
    GROUP BY product_id, color_variant_id
  `);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(availabilityKey(row.productId, row.colorVariantId), Number(row.reserved));
  }
  return map;
}

/** Availability for an explicit list of (productId, colorVariantId) keys. */
export async function getAvailability(
  keys: { productId: string; colorVariantId?: string | null }[]
): Promise<Map<string, Availability>> {
  const productIds = [...new Set(keys.map((k) => k.productId))];
  if (productIds.length === 0) return new Map();

  const [products, variants, reservationMap] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stockQuantity: true },
    }),
    prisma.productColorVariant.findMany({
      where: { productId: { in: productIds } },
      select: { id: true, productId: true, stockQuantity: true },
    }),
    getReservationMap(productIds),
  ]);

  const productOnHand = new Map(products.map((p) => [p.id, p.stockQuantity]));
  const variantOnHand = new Map(variants.map((v) => [v.id, { onHand: v.stockQuantity, productId: v.productId }]));

  const result = new Map<string, Availability>();
  for (const key of keys) {
    const k = availabilityKey(key.productId, key.colorVariantId);
    if (result.has(k)) continue;

    const reserved = reservationMap.get(k) ?? 0;
    const onHand = key.colorVariantId
      ? (variantOnHand.get(key.colorVariantId)?.onHand ?? 0)
      : (productOnHand.get(key.productId) ?? 0);

    result.set(k, {
      productId: key.productId,
      colorVariantId: key.colorVariantId ?? null,
      onHand,
      reserved,
      available: onHand - reserved,
    });
  }
  return result;
}

/** Availability for every colour variant (and the bare product) of a set of products. */
export async function getAvailabilityForProducts(
  productIds: string[]
): Promise<Map<string, Availability>> {
  if (productIds.length === 0) return new Map();

  const [products, reservationMap] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        stockQuantity: true,
        colorVariants: { select: { id: true, stockQuantity: true } },
      },
    }),
    getReservationMap(productIds),
  ]);

  const result = new Map<string, Availability>();
  for (const product of products) {
    if (product.colorVariants.length === 0) {
      const reserved = reservationMap.get(availabilityKey(product.id, null)) ?? 0;
      result.set(availabilityKey(product.id, null), {
        productId: product.id,
        colorVariantId: null,
        onHand: product.stockQuantity,
        reserved,
        available: product.stockQuantity - reserved,
      });
    } else {
      for (const variant of product.colorVariants) {
        const reserved = reservationMap.get(availabilityKey(product.id, variant.id)) ?? 0;
        result.set(availabilityKey(product.id, variant.id), {
          productId: product.id,
          colorVariantId: variant.id,
          onHand: variant.stockQuantity,
          reserved,
          available: variant.stockQuantity - reserved,
        });
      }
    }
  }
  return result;
}

/**
 * Non-mutating replacement for the old deduct-time shortage report.
 * Called when a document transitions into CONFIRMED, purely advisory.
 */
export async function checkAvailabilityForDocument(documentId: string): Promise<{
  shortages: StockShortage[];
  unmatchedLines: UnmatchedLine[];
}> {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { lineItems: { orderBy: { sequence: "asc" } } },
  });

  const shortages: StockShortage[] = [];
  const unmatchedLines: UnmatchedLine[] = [];

  const keys = document.lineItems
    .filter((item) => item.productId)
    .map((item) => ({ productId: item.productId!, colorVariantId: item.colorVariantId }));
  const availability = await getAvailability(keys);

  for (const item of document.lineItems) {
    if (!item.productId) {
      if (item.productSku) {
        unmatchedLines.push({ productSku: item.productSku, productName: item.productName });
      }
      continue;
    }

    const avail = availability.get(availabilityKey(item.productId, item.colorVariantId));
    const available = avail?.available ?? 0;

    if (item.quantity > available) {
      shortages.push({
        productSku: item.productSku ?? "",
        productName: item.productName,
        colorVariantName: item.colorVariantName,
        requested: item.quantity,
        available: Math.max(0, available),
        shortage: item.quantity - Math.max(0, available),
      });
    }
  }

  return { shortages, unmatchedLines };
}
