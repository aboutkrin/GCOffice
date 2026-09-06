import type { CatalogProduct, CatalogVariant } from "./types";

/**
 * Pure mapping from the website's catalog feed shape to the GCOffice columns
 * the sync is allowed to write. Nothing in here touches the database, so the
 * same functions serve the real run and the dry run.
 *
 * Field ownership (see CLAUDE.md): only website-owned fields are produced.
 * Cost fields, dimensions, stock and variant prices are never mapped.
 */

export function stripHtml(html: string): string {
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

/** Tile facts mirrored as JSON on `Product.websiteSpecs`. */
export interface WebsiteSpecs {
  unitLabel: string;
  weightKgPerUnit: string | null;
  sqmPerUnit: string | null;
  piecesPerUnit: number | null;
  tileSize: string | null;
  thickness: string | null;
  surfaceFinish: string | null;
  stockStatus: string;
  minOrderQty: number;
}

export interface MappedCatalogProduct {
  websiteProductId: number;
  /** Old WooCommerce post id, used to match `Product.woocommerceId`. */
  wpPostId: number | null;
  sku: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  status: "ACTIVE" | "INACTIVE";
  websiteSlug: string;
  websiteUpdatedAt: Date;
  websiteSpecs: WebsiteSpecs;
  primaryCategoryId: number | null;
}

export interface MappedCatalogVariant {
  websiteVariantId: number;
  name: string;
  colorHex: string | null;
  imageUrl: string | null;
  sortOrder: number;
  sku: string | null;
  websiteActive: boolean;
  websiteStockStatus: string;
}

function toNumber(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapCatalogProduct(cp: CatalogProduct): MappedCatalogProduct {
  const rawDescription = cp.shortDescription || cp.description;
  const description = rawDescription ? stripHtml(rawDescription) : null;

  const updatedAt = new Date(cp.updatedAt);

  return {
    websiteProductId: cp.id,
    wpPostId: cp.wpPostId ?? null,
    sku: cleanString(cp.sku),
    name: cp.name.trim(),
    description: description && description.length > 0 ? description : null,
    imageUrl: cp.images?.[0]?.url ?? null,
    basePrice: toNumber(cp.effectivePrice ?? cp.salePrice ?? cp.price),
    status: cp.status === "published" ? "ACTIVE" : "INACTIVE",
    websiteSlug: cp.slug,
    websiteUpdatedAt: Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
    websiteSpecs: {
      unitLabel: cp.unitLabel,
      weightKgPerUnit: cp.weightKgPerUnit,
      sqmPerUnit: cp.sqmPerUnit,
      piecesPerUnit: cp.piecesPerUnit,
      tileSize: cp.tileSize,
      thickness: cp.thickness,
      surfaceFinish: cp.surfaceFinish,
      stockStatus: cp.stockStatus,
      minOrderQty: cp.minOrderQty,
    },
    primaryCategoryId: cp.primaryCategoryId ?? null,
  };
}

export function mapCatalogVariant(v: CatalogVariant): MappedCatalogVariant {
  return {
    websiteVariantId: v.id,
    name: v.name.trim(),
    colorHex: cleanString(v.colorHex),
    imageUrl: cleanString(v.imageUrl),
    sortOrder: v.sortOrder,
    sku: cleanString(v.sku),
    websiteActive: v.isActive,
    websiteStockStatus: v.stockStatus,
  };
}
