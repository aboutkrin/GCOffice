/**
 * The catalog feed contract between goodchoiceth.com (producer) and GCOffice
 * (consumer). This file is copied verbatim into GCOffice at
 * `src/lib/catalog/types.ts` — keep the two in sync, and only add fields
 * (never rename or remove) so an older consumer keeps working.
 *
 * All nullable fields are serialised as `null`, never omitted. Prices and
 * weights are decimal strings exactly as Postgres `numeric` returns them.
 */

export type CatalogStockStatus = "in_stock" | "pre_order" | "out_of_stock";
export type CatalogContentStatus = "draft" | "published";

export type CatalogImage = {
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type CatalogCategoryRef = {
  id: number;
  slug: string;
  nameTh: string;
  nameEn: string | null;
  parentId: number | null;
};

export type CatalogCategory = CatalogCategoryRef & {
  sortOrder: number;
  isActive: boolean;
};

export type CatalogVariant = {
  id: number;
  /** The colour name the customer sees — "เขียวเซจ". Unique per product. */
  name: string;
  /** Colour family slug from the website's TILE_COLORS, or null. */
  colorSlug: string | null;
  /** Swatch hex resolved from the family, or null when the family is unknown. */
  colorHex: string | null;
  /** Thai family label, or null. */
  colorLabel: string | null;
  sku: string | null;
  imageUrl: string | null;
  stockStatus: CatalogStockStatus;
  sortOrder: number;
  /** false = the shop stopped selling this colour; kept for order history. */
  isActive: boolean;
};

export type CatalogProduct = {
  id: number;
  slug: string;
  sku: string | null;
  /** The WooCommerce post id this product was migrated from, or null. */
  wpPostId: number | null;
  name: string;
  /** HTML. */
  description: string | null;
  shortDescription: string | null;
  price: string | null;
  salePrice: string | null;
  /** `salePrice ?? price`, the number the shop actually charges. */
  effectivePrice: string | null;
  status: CatalogContentStatus;
  stockStatus: CatalogStockStatus;
  unitLabel: string;
  weightKgPerUnit: string | null;
  sqmPerUnit: string | null;
  minOrderQty: number;
  surfaceFinish: string | null;
  piecesPerUnit: number | null;
  tileSize: string | null;
  thickness: string | null;
  specs: Record<string, string> | null;
  /** Absolute URLs, ordered by sortOrder. */
  images: CatalogImage[];
  categories: CatalogCategoryRef[];
  /** The deepest assigned category (see shape.ts), or null. */
  primaryCategoryId: number | null;
  /** Every colour, including inactive ones, in admin order. */
  variants: CatalogVariant[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type CatalogHealthResponse = {
  ok: true;
  service: "goodchoiceth-catalog";
  productCount: number;
  time: string;
};

export type CatalogCategoriesResponse = { categories: CatalogCategory[] };

export type CatalogProductsResponse = {
  products: CatalogProduct[];
  /** Pass back as `cursor=` to fetch the next page; null on the last page. */
  nextCursor: number | null;
  generatedAt: string;
};

export type CatalogProductResponse = { product: CatalogProduct };

export type CatalogErrorResponse = { error: string };

/** Webhook the website POSTs to GCOffice after a product changes. */
export type CatalogWebhookEvent = "product.updated" | "product.deleted";

export type CatalogWebhookPayload = {
  id: string;
  event: CatalogWebhookEvent;
  productIds: number[];
  occurredAt: string;
};

/** Header carrying the webhook signature: `t=<unixSeconds>,v1=<hex>`. */
export const CATALOG_SIGNATURE_HEADER = "x-gc-signature";

export const CATALOG_PRODUCTS_MAX_LIMIT = 200;
export const CATALOG_PRODUCTS_DEFAULT_LIMIT = 100;
export const CATALOG_WEBHOOK_MAX_IDS = 200;
