import type { WooCommerceProduct } from "./woocommerce";
import { prisma } from "./prisma";

export interface MappedProduct {
  woocommerceId: number;
  name: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  status: "ACTIVE" | "INACTIVE";
  width: number | null;
  height: number | null;
  wcCategoryName: string | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export function mapWooCommerceProduct(wc: WooCommerceProduct): MappedProduct {
  const description = wc.short_description || wc.description;
  const price = parseFloat(wc.regular_price || wc.price || "0");
  const width = wc.dimensions?.width ? parseFloat(wc.dimensions.width) : null;
  const height = wc.dimensions?.height ? parseFloat(wc.dimensions.height) : null;

  return {
    woocommerceId: wc.id,
    name: wc.name,
    sku: wc.sku || null,
    description: description ? stripHtml(description) : null,
    imageUrl: wc.images?.[0]?.src ?? null,
    basePrice: isNaN(price) ? 0 : price,
    status: wc.status === "publish" ? "ACTIVE" : "INACTIVE",
    width: width && !isNaN(width) ? width : null,
    height: height && !isNaN(height) ? height : null,
    wcCategoryName: wc.categories?.[0]?.name ?? null,
  };
}

/**
 * Resolve a WooCommerce category name to a ProductCategory ID.
 * If no match is found, auto-create one with an auto-generated prefix.
 */
export async function resolveCategory(
  wcCategoryName: string | null
): Promise<string | null> {
  if (!wcCategoryName) return null;

  // Try case-insensitive match
  const existing = await prisma.productCategory.findFirst({
    where: { name: { equals: wcCategoryName, mode: "insensitive" } },
  });

  if (existing) return existing.id;

  // Auto-create with generated prefix
  const count = await prisma.productCategory.count();
  const prefixNum = count + 1;
  const prefix = `WC${String(prefixNum).padStart(2, "0")}`;

  const created = await prisma.productCategory.create({
    data: {
      name: wcCategoryName,
      prefix,
    },
  });

  return created.id;
}

/**
 * Resolve SKU: use WC SKU if non-empty and no conflict with a different product,
 * otherwise prefix with "WC-". If no WC SKU, returns null (caller should auto-generate).
 */
export async function resolveSku(
  wcSku: string | null,
  woocommerceId: number
): Promise<string | null> {
  if (!wcSku) return null;

  const conflicting = await prisma.product.findUnique({
    where: { sku: wcSku },
    select: { woocommerceId: true },
  });

  // No conflict, or same WC product already owns this SKU
  if (!conflicting || conflicting.woocommerceId === woocommerceId) {
    return wcSku;
  }

  // Conflict with a different product — prefix with WC-
  const prefixed = `WC-${wcSku}`;
  const prefixedConflict = await prisma.product.findUnique({
    where: { sku: prefixed },
    select: { woocommerceId: true },
  });

  if (!prefixedConflict || prefixedConflict.woocommerceId === woocommerceId) {
    return prefixed;
  }

  // Fallback: return null, let caller auto-generate
  return null;
}
