import { prisma } from "./prisma";

/**
 * Stable scan-code identity for products and colour variants.
 *
 * Product.stockCode is backfilled from sku, then never rewritten.
 * ProductColorVariant.stockCode is "<productStockCode>#<nn>", nn assigned
 * once at creation (max existing nn + 1) and never reused — so deleting or
 * renaming a colour can never re-point a label already printed and stuck on
 * a box. The "#" is the discriminator between a product code and a variant
 * code.
 *
 * QR payload = the bare stockCode string (optionally prefixed "GCS:" or
 * wrapped in a "https://.../s/<code>" URL, both tolerated for future-proofing).
 */

const VARIANT_CODE_SEPARATOR = "#";

/** Build the next variant stock code for a product, given existing sibling codes. */
export function buildVariantStockCode(
  productStockCode: string,
  existingVariantCodes: string[]
): string {
  let maxSeq = 0;
  for (const code of existingVariantCodes) {
    const idx = code.lastIndexOf(VARIANT_CODE_SEPARATOR);
    if (idx === -1) continue;
    const seq = parseInt(code.slice(idx + 1), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  const next = (maxSeq + 1).toString().padStart(2, "0");
  return `${productStockCode}${VARIANT_CODE_SEPARATOR}${next}`;
}

/** Strip a "GCS:" prefix or "https://.../s/<code>" wrapper and normalize case/whitespace. */
export function normalizeScan(raw: string): string {
  let code = raw.trim();
  if (code.toUpperCase().startsWith("GCS:")) {
    code = code.slice(4);
  } else {
    try {
      const url = new URL(code);
      const parts = url.pathname.split("/").filter(Boolean);
      const sIdx = parts.indexOf("s");
      if (sIdx !== -1 && parts[sIdx + 1]) {
        code = parts[sIdx + 1];
      }
    } catch {
      // not a URL, use as-is
    }
  }
  return code.trim();
}

export function isVariantCode(code: string): boolean {
  return code.includes(VARIANT_CODE_SEPARATOR);
}

export type StockCodeResolution =
  | {
      kind: "variant";
      productId: string;
      productName: string;
      productSku: string;
      colorVariantId: string;
      colorVariantName: string;
      colorVariantSku: string | null;
      stockQuantity: number;
    }
  | {
      kind: "product";
      productId: string;
      productName: string;
      productSku: string;
      stockQuantity: number;
    }
  | {
      kind: "product-needs-variant";
      productId: string;
      productName: string;
      productSku: string;
      colorVariants: {
        id: string;
        name: string;
        colorHex: string | null;
        stockQuantity: number;
      }[];
    }
  | {
      kind: "ambiguous";
      matches: {
        productId: string;
        productName: string;
        productSku: string;
        colorVariantId: string;
        colorVariantName: string;
      }[];
    }
  | { kind: "not-found" };

/**
 * Resolve a scanned/typed code to the product or colour variant it identifies.
 * See module doc for the resolution order.
 */
export async function resolveStockCode(raw: string): Promise<StockCodeResolution> {
  const code = normalizeScan(raw);
  if (!code) return { kind: "not-found" };

  if (isVariantCode(code)) {
    const variant = await prisma.productColorVariant.findUnique({
      where: { stockCode: code },
      include: { product: true },
    });
    if (variant) {
      return {
        kind: "variant",
        productId: variant.productId,
        productName: variant.product.name,
        productSku: variant.product.sku,
        colorVariantId: variant.id,
        colorVariantName: variant.name,
        colorVariantSku: variant.sku,
        stockQuantity: variant.stockQuantity,
      };
    }
  }

  const product = await prisma.product.findUnique({
    where: { stockCode: code },
    include: { colorVariants: { orderBy: { sortOrder: "asc" } } },
  });
  if (product) {
    if (product.colorVariants.length > 0) {
      return {
        kind: "product-needs-variant",
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        colorVariants: product.colorVariants.map((v) => ({
          id: v.id,
          name: v.name,
          colorHex: v.colorHex,
          stockQuantity: v.stockQuantity,
        })),
      };
    }
    return {
      kind: "product",
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      stockQuantity: product.stockQuantity,
    };
  }

  // Typed/legacy-label fallback: bare product sku
  const bySku = await prisma.product.findUnique({
    where: { sku: code },
    include: { colorVariants: { orderBy: { sortOrder: "asc" } } },
  });
  if (bySku) {
    if (bySku.colorVariants.length > 0) {
      return {
        kind: "product-needs-variant",
        productId: bySku.id,
        productName: bySku.name,
        productSku: bySku.sku,
        colorVariants: bySku.colorVariants.map((v) => ({
          id: v.id,
          name: v.name,
          colorHex: v.colorHex,
          stockQuantity: v.stockQuantity,
        })),
      };
    }
    return {
      kind: "product",
      productId: bySku.id,
      productName: bySku.name,
      productSku: bySku.sku,
      stockQuantity: bySku.stockQuantity,
    };
  }

  // Website colour code (ProductColorVariant.sku) — nullable, non-unique
  const byVariantSku = await prisma.productColorVariant.findMany({
    where: { sku: code },
    include: { product: true },
  });
  if (byVariantSku.length === 1) {
    const variant = byVariantSku[0];
    return {
      kind: "variant",
      productId: variant.productId,
      productName: variant.product.name,
      productSku: variant.product.sku,
      colorVariantId: variant.id,
      colorVariantName: variant.name,
      colorVariantSku: variant.sku,
      stockQuantity: variant.stockQuantity,
    };
  }
  if (byVariantSku.length > 1) {
    return {
      kind: "ambiguous",
      matches: byVariantSku.map((v) => ({
        productId: v.productId,
        productName: v.product.name,
        productSku: v.product.sku,
        colorVariantId: v.id,
        colorVariantName: v.name,
      })),
    };
  }

  return { kind: "not-found" };
}
