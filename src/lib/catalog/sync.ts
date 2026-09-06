import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { generateProductSku } from "@/lib/sku-generator";
import type { Prisma, SyncTrigger } from "@/generated/prisma/client";

import {
  fetchAllCatalogProducts,
  fetchCatalogCategories,
  fetchCatalogProduct,
} from "./client";
import {
  mapCatalogProduct,
  mapCatalogVariant,
  type MappedCatalogProduct,
  type MappedCatalogVariant,
} from "./mapper";
import type { CatalogCategory, CatalogProduct } from "./types";

/**
 * One-way catalog sync: goodchoiceth.com -> GCOffice.
 *
 * Website-owned fields (overwritten on every run): product name, description,
 * primary image, price, status, category, tile facts; variant name, colourHex,
 * image, sortOrder, sku, websiteActive, websiteStockStatus.
 *
 * GCOffice-owned fields (never touched here): costPrice, exchangeRate,
 * weightPerBox, shippingCostPerBox, width/height, stockQuantity,
 * lowStockThreshold, variant.price, variant stock and stock movements,
 * variants without a websiteVariantId, MANUAL products, and existing SKUs
 * (`src/data/stock.ts` aggregates history by productSku).
 *
 * Nothing is ever deleted. Products that disappear from the website become
 * INACTIVE; variants that disappear are left alone.
 */

type Tx = Prisma.TransactionClient;

// A run cannot outlive its function (maxDuration 300s on the cron route and the
// sync page), so a RUNNING row older than this was killed mid-flight and must
// not block the next run.
const STALE_RUNNING_MS = 10 * 60 * 1000;
const PRODUCT_TX_TIMEOUT_MS = 20_000;
const WEBSITE_PREFIX = "WEB";

export interface CatalogSyncResult {
  logId: string;
  dryRun: boolean;
  totalFetched: number;
  created: number;
  updated: number;
  deactivated: number;
  failed: number;
  details: CatalogSyncDetails;
}

export interface UnmatchedColours {
  productSku: string;
  productName: string;
  gcofficeNames: string[];
  websiteNames: string[];
}

/** Stored on `CatalogSyncLog.details`; the dry-run dialog renders this. */
export interface CatalogSyncDetails {
  toCreate: { name: string; sku: string }[];
  toUpdate: number;
  toDeactivate: { sku: string; name: string }[];
  categoriesToCreate: string[];
  unmatchedColours: UnmatchedColours[];
  errors: { websiteProductId: number; name: string; message: string }[];
  /** Linked products whose website `updatedAt` has not moved since the last run; no writes made. */
  unchanged: number;
}

export interface SyncOptions {
  dryRun?: boolean;
}

// ----------------------------------------------------------------------------
// In-memory indexes preloaded once per run
// ----------------------------------------------------------------------------

interface CategoryRow {
  id: string;
  name: string;
  prefix: string | null;
  websiteCategoryId: number | null;
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  source: string;
  status: string;
  woocommerceId: number | null;
  websiteProductId: number | null;
  websiteUpdatedAt: Date | null;
  lastSyncedAt: Date | null;
}

interface VariantRow {
  id: string;
  productId: string;
  name: string;
  websiteVariantId: number | null;
  colorHex: string | null;
  imageUrl: string | null;
  sortOrder: number;
  sku: string | null;
  websiteActive: boolean;
  websiteStockStatus: string | null;
}

const VARIANT_ROW_SELECT = {
  id: true,
  productId: true,
  name: true,
  websiteVariantId: true,
  colorHex: true,
  imageUrl: true,
  sortOrder: true,
  sku: true,
  websiteActive: true,
  websiteStockStatus: true,
} as const;

interface SyncContext {
  dryRun: boolean;
  now: Date;
  categoriesByWebsiteId: Map<number, CategoryRow>;
  categoriesByLowerName: Map<string, CategoryRow>;
  usedPrefixes: Set<string>;
  /** Website categories by id, from `/api/catalog/categories`. */
  websiteCategories: Map<number, CatalogCategory>;
  productsByWebsiteId: Map<number, ProductRow>;
  productsByWcId: Map<number, ProductRow>;
  productsBySku: Map<string, ProductRow>;
  variantsByProductId: Map<string, VariantRow[]>;
  /** GCOffice product ids seen (matched or created) during this run. */
  seenProductIds: Set<string>;
  details: CatalogSyncDetails;
}

function emptyDetails(): CatalogSyncDetails {
  return {
    toCreate: [],
    toUpdate: 0,
    toDeactivate: [],
    categoriesToCreate: [],
    unmatchedColours: [],
    errors: [],
    unchanged: 0,
  };
}

async function buildContext(
  dryRun: boolean,
  websiteCategories: CatalogCategory[]
): Promise<SyncContext> {
  const [categories, products, variants] = await Promise.all([
    prisma.productCategory.findMany({
      select: { id: true, name: true, prefix: true, websiteCategoryId: true },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        source: true,
        status: true,
        woocommerceId: true,
        websiteProductId: true,
        websiteUpdatedAt: true,
        lastSyncedAt: true,
      },
    }),
    prisma.productColorVariant.findMany({
      select: VARIANT_ROW_SELECT,
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const ctx: SyncContext = {
    dryRun,
    now: new Date(),
    categoriesByWebsiteId: new Map(),
    categoriesByLowerName: new Map(),
    usedPrefixes: new Set(),
    websiteCategories: new Map(websiteCategories.map((c) => [c.id, c])),
    productsByWebsiteId: new Map(),
    productsByWcId: new Map(),
    productsBySku: new Map(),
    variantsByProductId: new Map(),
    seenProductIds: new Set(),
    details: emptyDetails(),
  };

  for (const c of categories) {
    if (c.websiteCategoryId !== null) ctx.categoriesByWebsiteId.set(c.websiteCategoryId, c);
    ctx.categoriesByLowerName.set(normalizeName(c.name), c);
    if (c.prefix) ctx.usedPrefixes.add(c.prefix.toUpperCase());
  }
  for (const p of products) {
    if (p.websiteProductId !== null) ctx.productsByWebsiteId.set(p.websiteProductId, p);
    if (p.woocommerceId !== null) ctx.productsByWcId.set(p.woocommerceId, p);
    ctx.productsBySku.set(p.sku, p);
  }
  for (const v of variants) {
    const list = ctx.variantsByProductId.get(v.productId);
    if (list) list.push(v);
    else ctx.variantsByProductId.set(v.productId, [v]);
  }

  return ctx;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ----------------------------------------------------------------------------
// Category resolution
// ----------------------------------------------------------------------------

function nextFreePrefix(used: Set<string>): string {
  for (let n = 1; n < 1000; n++) {
    const candidate = `${WEBSITE_PREFIX}${String(n).padStart(2, "0")}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("ไม่สามารถสร้างรหัสนำหน้าหมวดหมู่ใหม่ได้ (WEBnn เต็ม)");
}

/**
 * websiteCategoryId -> case-insensitive name match on the website's nameTh
 * (then pin the id on that row) -> create with the next free `WEBnn` prefix.
 */
async function resolveCategoryId(
  mapped: MappedCatalogProduct,
  cp: CatalogProduct,
  ctx: SyncContext,
  tx: Tx | null
): Promise<string | null> {
  const websiteCategoryId = mapped.primaryCategoryId;
  if (websiteCategoryId === null) return null;

  const byId = ctx.categoriesByWebsiteId.get(websiteCategoryId);
  if (byId) return byId.id;

  const websiteCategory =
    ctx.websiteCategories.get(websiteCategoryId) ??
    cp.categories.find((c) => c.id === websiteCategoryId);
  if (!websiteCategory) return null;

  const nameTh = websiteCategory.nameTh.trim();
  const byName = ctx.categoriesByLowerName.get(normalizeName(nameTh));

  if (byName && byName.websiteCategoryId === null) {
    if (tx) {
      await tx.productCategory.update({
        where: { id: byName.id },
        data: { websiteCategoryId },
      });
    }
    byName.websiteCategoryId = websiteCategoryId;
    ctx.categoriesByWebsiteId.set(websiteCategoryId, byName);
    return byName.id;
  }

  // Either no name match, or the same Thai name is already pinned to another
  // website category (both `name` and `websiteCategoryId` are unique).
  const name = byName ? `${nameTh} (${websiteCategory.slug})` : nameTh;
  const prefix = nextFreePrefix(ctx.usedPrefixes);

  let row: CategoryRow;
  if (tx) {
    const created = await tx.productCategory.create({
      data: { name, prefix, websiteCategoryId },
      select: { id: true, name: true, prefix: true, websiteCategoryId: true },
    });
    row = created;
  } else {
    row = { id: `dry-run-${websiteCategoryId}`, name, prefix, websiteCategoryId };
    ctx.details.categoriesToCreate.push(`${name} (${prefix})`);
  }

  ctx.usedPrefixes.add(prefix);
  ctx.categoriesByWebsiteId.set(websiteCategoryId, row);
  ctx.categoriesByLowerName.set(normalizeName(name), row);
  return row.id;
}

// ----------------------------------------------------------------------------
// SKU resolution (create only — existing SKUs are never rewritten)
// ----------------------------------------------------------------------------

function isSkuFree(sku: string, ctx: SyncContext): boolean {
  return !ctx.productsBySku.has(sku);
}

/**
 * website sku if free -> `WEB-${sku}` if free -> generated from the category
 * prefix -> `WEB-${websiteProductId}`.
 */
async function resolveNewSku(
  mapped: MappedCatalogProduct,
  categoryId: string | null,
  ctx: SyncContext,
  tx: Tx | null
): Promise<string> {
  const websiteSku = mapped.sku;
  if (websiteSku && isSkuFree(websiteSku, ctx)) return websiteSku;
  if (websiteSku && isSkuFree(`WEB-${websiteSku}`, ctx)) return `WEB-${websiteSku}`;

  if (categoryId) {
    const category = findCategoryById(categoryId, ctx);
    if (category?.prefix) {
      if (tx) {
        return generateProductSku(categoryId, tx);
      }
      // Dry run: the counter is not incremented, show the pattern instead.
      return `${category.prefix}-XXXX`;
    }
  }

  return `WEB-${mapped.websiteProductId}`;
}

function findCategoryById(id: string, ctx: SyncContext): CategoryRow | undefined {
  for (const row of ctx.categoriesByLowerName.values()) {
    if (row.id === id) return row;
  }
  return undefined;
}

// ----------------------------------------------------------------------------
// Product matching
// ----------------------------------------------------------------------------

/**
 * websiteProductId -> woocommerceId === wpPostId -> sku === website sku.
 * The two fallbacks only apply to rows not yet linked to a website product.
 */
function matchExistingProduct(
  mapped: MappedCatalogProduct,
  ctx: SyncContext
): ProductRow | null {
  const byWebsiteId = ctx.productsByWebsiteId.get(mapped.websiteProductId);
  if (byWebsiteId) return byWebsiteId;

  if (mapped.wpPostId !== null) {
    const byWcId = ctx.productsByWcId.get(mapped.wpPostId);
    if (byWcId && byWcId.websiteProductId === null) return byWcId;
  }

  if (mapped.sku) {
    const bySku = ctx.productsBySku.get(mapped.sku);
    if (bySku && bySku.websiteProductId === null) return bySku;
  }

  return null;
}

// ----------------------------------------------------------------------------
// Variants
// ----------------------------------------------------------------------------

interface VariantPlan {
  toUpdate: { row: VariantRow; data: MappedCatalogVariant; renameBlocked: boolean }[];
  toCreate: MappedCatalogVariant[];
  unmatched: UnmatchedColours | null;
}

/**
 * Match each website colour to a GCOffice colour by websiteVariantId, then
 * exact name, then case-insensitive trimmed name. A GCOffice colour is used at
 * most once per run and a colour already owned by another website variant is
 * never re-matched by name.
 */
function planVariants(
  cp: CatalogProduct,
  productRow: { sku: string; name: string },
  existing: VariantRow[]
): VariantPlan {
  const byWebsiteId = new Map<number, VariantRow>();
  const byExactName = new Map<string, VariantRow>();
  const byLowerName = new Map<string, VariantRow>();
  for (const v of existing) {
    if (v.websiteVariantId !== null) byWebsiteId.set(v.websiteVariantId, v);
    byExactName.set(v.name, v);
    if (!byLowerName.has(normalizeName(v.name))) byLowerName.set(normalizeName(v.name), v);
  }

  const claimed = new Set<string>();
  const plan: VariantPlan = { toUpdate: [], toCreate: [], unmatched: null };
  const unmatchedWebsiteNames: string[] = [];

  const websiteVariants = [...cp.variants].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const wv of websiteVariants) {
    const mapped = mapCatalogVariant(wv);

    let match: VariantRow | undefined = byWebsiteId.get(mapped.websiteVariantId);
    if (!match) {
      const candidate =
        byExactName.get(mapped.name) ?? byLowerName.get(normalizeName(mapped.name));
      if (candidate && candidate.websiteVariantId === null && !claimed.has(candidate.id)) {
        match = candidate;
      }
    }

    if (match) {
      claimed.add(match.id);
      // Renaming to a name another colour of this product already holds would
      // hit the (productId, name) unique index and abort the whole product.
      const nameOwner = byExactName.get(mapped.name);
      const renameBlocked =
        match.name !== mapped.name && nameOwner !== undefined && nameOwner.id !== match.id;
      plan.toUpdate.push({ row: match, data: mapped, renameBlocked });
    } else {
      plan.toCreate.push(mapped);
      unmatchedWebsiteNames.push(mapped.name);
    }
  }

  const unmatchedGcNames = existing
    .filter((v) => v.websiteVariantId === null && !claimed.has(v.id))
    .map((v) => v.name);

  if (unmatchedGcNames.length > 0 && unmatchedWebsiteNames.length > 0) {
    plan.unmatched = {
      productSku: productRow.sku,
      productName: productRow.name,
      gcofficeNames: unmatchedGcNames,
      websiteNames: unmatchedWebsiteNames,
    };
  }

  return plan;
}

async function applyVariantPlan(
  tx: Tx,
  productId: string,
  plan: VariantPlan,
  ctx: SyncContext
): Promise<void> {
  for (const { row, data, renameBlocked } of plan.toUpdate) {
    if (renameBlocked) {
      console.warn(
        `[catalog-sync] colour "${row.name}" of product ${productId} not renamed to "${data.name}": name already used`
      );
    }
    // Every write is a round trip to the database; skip colours that already
    // match the website exactly.
    const sameName = renameBlocked || row.name === data.name;
    if (
      sameName &&
      row.websiteVariantId === data.websiteVariantId &&
      row.colorHex === data.colorHex &&
      row.imageUrl === data.imageUrl &&
      row.sortOrder === data.sortOrder &&
      row.sku === data.sku &&
      row.websiteActive === data.websiteActive &&
      row.websiteStockStatus === data.websiteStockStatus
    ) {
      continue;
    }
    await tx.productColorVariant.update({
      where: { id: row.id },
      data: {
        ...(renameBlocked ? {} : { name: data.name }),
        colorHex: data.colorHex,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder,
        sku: data.sku,
        websiteVariantId: data.websiteVariantId,
        websiteActive: data.websiteActive,
        websiteStockStatus: data.websiteStockStatus,
      },
    });
    row.websiteVariantId = data.websiteVariantId;
    if (!renameBlocked) row.name = data.name;
    row.colorHex = data.colorHex;
    row.imageUrl = data.imageUrl;
    row.sortOrder = data.sortOrder;
    row.sku = data.sku;
    row.websiteActive = data.websiteActive;
    row.websiteStockStatus = data.websiteStockStatus;
  }

  if (plan.toCreate.length > 0) {
    for (const data of plan.toCreate) {
      const created = await tx.productColorVariant.create({
        data: {
          productId,
          name: data.name,
          colorHex: data.colorHex,
          imageUrl: data.imageUrl,
          sortOrder: data.sortOrder,
          sku: data.sku,
          websiteVariantId: data.websiteVariantId,
          websiteActive: data.websiteActive,
          websiteStockStatus: data.websiteStockStatus,
        },
        select: VARIANT_ROW_SELECT,
      });
      const list = ctx.variantsByProductId.get(productId);
      if (list) list.push(created);
      else ctx.variantsByProductId.set(productId, [created]);
    }

    // Mirrors saveColorVariantsInTransaction: once a product has colours, its
    // stock is the sum of the colours' stock.
    const agg = await tx.productColorVariant.aggregate({
      where: { productId },
      _sum: { stockQuantity: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: agg._sum.stockQuantity ?? 0 },
    });
  }
}

// ----------------------------------------------------------------------------
// Per-product upsert
// ----------------------------------------------------------------------------

type UpsertOutcome = "created" | "updated" | "unchanged";

/**
 * One product, one transaction. In dry-run mode nothing is written; the
 * outcome is recorded on `ctx.details` instead.
 */
async function upsertCatalogProduct(
  cp: CatalogProduct,
  ctx: SyncContext
): Promise<UpsertOutcome> {
  const mapped = mapCatalogProduct(cp);
  const existing = matchExistingProduct(mapped, ctx);
  // Mark the match as seen before any write: if this product's transaction
  // fails, the deactivation pass must not treat it as gone from the website.
  if (existing) ctx.seenProductIds.add(existing.id);

  if (ctx.dryRun) {
    const categoryId = await resolveCategoryId(mapped, cp, ctx, null);
    if (existing) {
      ctx.seenProductIds.add(existing.id);
      existing.websiteProductId = mapped.websiteProductId;
      ctx.productsByWebsiteId.set(mapped.websiteProductId, existing);
      ctx.details.toUpdate++;
      const plan = planVariants(cp, existing, ctx.variantsByProductId.get(existing.id) ?? []);
      if (plan.unmatched) ctx.details.unmatchedColours.push(plan.unmatched);
      return "updated";
    }
    const sku = await resolveNewSku(mapped, categoryId, ctx, null);
    ctx.details.toCreate.push({ name: mapped.name, sku });
    if (!sku.endsWith("-XXXX")) {
      ctx.productsBySku.set(sku, {
        id: `dry-run-${mapped.websiteProductId}`,
        sku,
        name: mapped.name,
        source: "WEBSITE",
        status: mapped.status,
        woocommerceId: null,
        websiteProductId: mapped.websiteProductId,
        websiteUpdatedAt: null,
        lastSyncedAt: null,
      });
    }
    return "created";
  }

  // Already linked and the website has not touched it since we last wrote it:
  // nothing to do. Every product save on the website bumps `updatedAt` (colour
  // edits go through the same save), so this is safe and makes the nightly run
  // nearly free.
  if (
    existing &&
    existing.websiteProductId === mapped.websiteProductId &&
    existing.lastSyncedAt !== null &&
    existing.websiteUpdatedAt !== null &&
    existing.websiteUpdatedAt.getTime() === mapped.websiteUpdatedAt.getTime()
  ) {
    ctx.details.unchanged++;
    return "unchanged";
  }

  const outcome = await prisma.$transaction(
    async (tx): Promise<UpsertOutcome> => {
      const categoryId = await resolveCategoryId(mapped, cp, ctx, tx);

      const websiteOwned = {
        name: mapped.name,
        description: mapped.description,
        imageUrl: mapped.imageUrl,
        basePrice: mapped.basePrice,
        status: mapped.status,
        source: "WEBSITE" as const,
        websiteProductId: mapped.websiteProductId,
        websiteSlug: mapped.websiteSlug,
        websiteSpecs: mapped.websiteSpecs as unknown as Prisma.InputJsonValue,
        websiteUpdatedAt: mapped.websiteUpdatedAt,
        lastSyncedAt: ctx.now,
        // When the website assigns no category the GCOffice category is kept.
        ...(categoryId ? { categoryId } : {}),
      };

      if (existing) {
        await tx.product.update({
          where: { id: existing.id },
          data: websiteOwned,
        });
        const plan = planVariants(cp, existing, ctx.variantsByProductId.get(existing.id) ?? []);
        if (plan.unmatched) ctx.details.unmatchedColours.push(plan.unmatched);
        await applyVariantPlan(tx, existing.id, plan, ctx);

        existing.websiteProductId = mapped.websiteProductId;
        existing.source = "WEBSITE";
        existing.status = mapped.status;
        existing.websiteUpdatedAt = mapped.websiteUpdatedAt;
        existing.lastSyncedAt = ctx.now;
        ctx.productsByWebsiteId.set(mapped.websiteProductId, existing);
        ctx.seenProductIds.add(existing.id);
        return "updated";
      }

      const sku = await resolveNewSku(mapped, categoryId, ctx, tx);
      const created = await tx.product.create({
        data: { sku, ...websiteOwned },
        select: { id: true },
      });

      const plan = planVariants(cp, { sku, name: mapped.name }, []);
      await applyVariantPlan(tx, created.id, plan, ctx);

      const row: ProductRow = {
        id: created.id,
        sku,
        name: mapped.name,
        source: "WEBSITE",
        status: mapped.status,
        woocommerceId: null,
        websiteProductId: mapped.websiteProductId,
        websiteUpdatedAt: mapped.websiteUpdatedAt,
        lastSyncedAt: ctx.now,
      };
      ctx.productsBySku.set(sku, row);
      ctx.productsByWebsiteId.set(mapped.websiteProductId, row);
      ctx.seenProductIds.add(created.id);
      return "created";
    },
    { timeout: PRODUCT_TX_TIMEOUT_MS }
  );

  return outcome;
}

// ----------------------------------------------------------------------------
// Deactivation
// ----------------------------------------------------------------------------

/**
 * WEBSITE / WOOCOMMERCE products the feed no longer contains become INACTIVE.
 * MANUAL products are never touched. Returns the number of rows affected.
 */
async function deactivateUnseen(ctx: SyncContext): Promise<number> {
  const unseen: ProductRow[] = [];
  const all = new Map<string, ProductRow>();
  for (const p of ctx.productsBySku.values()) all.set(p.id, p);
  for (const p of all.values()) {
    if (p.id.startsWith("dry-run-")) continue;
    if (p.source !== "WEBSITE" && p.source !== "WOOCOMMERCE") continue;
    if (p.status !== "ACTIVE") continue;
    if (ctx.seenProductIds.has(p.id)) continue;
    unseen.push(p);
  }

  if (unseen.length === 0) return 0;

  if (ctx.dryRun) {
    ctx.details.toDeactivate = unseen.map((p) => ({ sku: p.sku, name: p.name }));
    return unseen.length;
  }

  const result = await prisma.product.updateMany({
    where: { id: { in: unseen.map((p) => p.id) }, status: "ACTIVE" },
    data: { status: "INACTIVE" },
  });
  return result.count;
}

// ----------------------------------------------------------------------------
// Log lifecycle
// ----------------------------------------------------------------------------

async function guardAgainstRunningSync(): Promise<void> {
  const running = await prisma.catalogSyncLog.findFirst({
    where: { status: "RUNNING", scope: "full" },
    orderBy: { startedAt: "desc" },
  });
  if (!running) return;

  const staleBefore = new Date(Date.now() - STALE_RUNNING_MS);
  if (running.startedAt < staleBefore) {
    await prisma.catalogSyncLog.update({
      where: { id: running.id },
      data: {
        status: "FAILED",
        errorMessage: "Sync timed out (exceeded 30 minutes)",
        completedAt: new Date(),
      },
    });
    return;
  }

  throw new Error("มีการซิงค์กำลังทำงานอยู่ กรุณารอให้เสร็จก่อน");
}

function toJson(details: CatalogSyncDetails): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue;
}

function revalidateSyncPages(): void {
  try {
    revalidatePath("/products");
    revalidatePath("/website-sync");
    revalidatePath("/stock");
  } catch (err) {
    // Not in a request scope (e.g. a detached job); the next render is fresh anyway.
    console.warn("[catalog-sync] revalidatePath skipped:", err instanceof Error ? err.message : err);
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Full reconcile: fetch every product from the website, upsert each one, and
 * deactivate what the website no longer has. `dryRun` computes the same plan
 * and writes only the log row (with `details`).
 */
export async function syncAll(
  trigger: SyncTrigger,
  options: SyncOptions = {}
): Promise<CatalogSyncResult> {
  const dryRun = options.dryRun ?? false;

  await guardAgainstRunningSync();

  const log = await prisma.catalogSyncLog.create({
    data: { status: "RUNNING", trigger, scope: "full", dryRun },
  });

  const result: CatalogSyncResult = {
    logId: log.id,
    dryRun,
    totalFetched: 0,
    created: 0,
    updated: 0,
    deactivated: 0,
    failed: 0,
    details: emptyDetails(),
  };

  try {
    const [websiteCategories, websiteProducts] = await Promise.all([
      fetchCatalogCategories(),
      fetchAllCatalogProducts(),
    ]);
    result.totalFetched = websiteProducts.length;

    const ctx = await buildContext(dryRun, websiteCategories);
    result.details = ctx.details;

    for (const cp of websiteProducts) {
      try {
        const outcome = await upsertCatalogProduct(cp, ctx);
        if (outcome === "created") result.created++;
        else if (outcome === "updated") result.updated++;
      } catch (err) {
        result.failed++;
        const message = err instanceof Error ? err.message : String(err);
        ctx.details.errors.push({ websiteProductId: cp.id, name: cp.name, message });
        console.error(`[catalog-sync] product ${cp.id} (${cp.name}) failed:`, message);
      }
    }

    result.deactivated = await deactivateUnseen(ctx);

    await prisma.catalogSyncLog.update({
      where: { id: log.id },
      data: {
        status: "COMPLETED",
        totalFetched: result.totalFetched,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        failed: result.failed,
        details: toJson(result.details),
        completedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.catalogSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        totalFetched: result.totalFetched,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        failed: result.failed,
        errorMessage: err instanceof Error ? err.message : String(err),
        details: toJson(result.details),
        completedAt: new Date(),
      },
    });
    throw err;
  }

  if (!dryRun) revalidateSyncPages();

  return result;
}

/**
 * Webhook path: re-fetch the given website products and upsert them. A 404
 * from the website means the product was deleted there -> INACTIVE here.
 * No running-guard: webhook and nightly runs are both idempotent upserts.
 */
export async function syncProductIds(
  ids: number[],
  trigger: SyncTrigger = "WEBHOOK"
): Promise<CatalogSyncResult> {
  const uniqueIds = [...new Set(ids)];

  const log = await prisma.catalogSyncLog.create({
    data: { status: "RUNNING", trigger, scope: "products", dryRun: false },
  });

  const result: CatalogSyncResult = {
    logId: log.id,
    dryRun: false,
    totalFetched: 0,
    created: 0,
    updated: 0,
    deactivated: 0,
    failed: 0,
    details: emptyDetails(),
  };

  try {
    const websiteCategories = await fetchCatalogCategories();
    const ctx = await buildContext(false, websiteCategories);
    result.details = ctx.details;

    for (const id of uniqueIds) {
      try {
        const cp = await fetchCatalogProduct(id);
        if (!cp) {
          const deactivated = await prisma.product.updateMany({
            where: { websiteProductId: id, status: "ACTIVE" },
            data: { status: "INACTIVE" },
          });
          result.deactivated += deactivated.count;
          continue;
        }
        result.totalFetched++;
        const outcome = await upsertCatalogProduct(cp, ctx);
        if (outcome === "created") result.created++;
        else if (outcome === "updated") result.updated++;
      } catch (err) {
        result.failed++;
        const message = err instanceof Error ? err.message : String(err);
        ctx.details.errors.push({ websiteProductId: id, name: `#${id}`, message });
        console.error(`[catalog-sync] product ${id} failed:`, message);
      }
    }

    await prisma.catalogSyncLog.update({
      where: { id: log.id },
      data: {
        status: "COMPLETED",
        totalFetched: result.totalFetched,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        failed: result.failed,
        details: toJson(result.details),
        completedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.catalogSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        totalFetched: result.totalFetched,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        failed: result.failed,
        errorMessage: err instanceof Error ? err.message : String(err),
        details: toJson(result.details),
        completedAt: new Date(),
      },
    });
    throw err;
  }

  revalidateSyncPages();

  return result;
}

/**
 * `product.deleted` webhook: the website has already removed the rows, so no
 * re-fetch is possible. Mark the mirrored products INACTIVE (never delete).
 */
export async function markWebsiteProductsDeleted(
  ids: number[],
  trigger: SyncTrigger = "WEBHOOK"
): Promise<number> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return 0;

  const log = await prisma.catalogSyncLog.create({
    data: { status: "RUNNING", trigger, scope: "products", dryRun: false },
  });

  try {
    const result = await prisma.product.updateMany({
      where: { websiteProductId: { in: uniqueIds }, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });

    await prisma.catalogSyncLog.update({
      where: { id: log.id },
      data: {
        status: "COMPLETED",
        totalFetched: uniqueIds.length,
        deactivated: result.count,
        completedAt: new Date(),
      },
    });

    revalidateSyncPages();
    return result.count;
  } catch (err) {
    await prisma.catalogSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        totalFetched: uniqueIds.length,
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
    throw err;
  }
}
