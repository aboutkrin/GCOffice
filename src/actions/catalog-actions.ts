"use server";

import { revalidatePath } from "next/cache";

import { syncAll, type CatalogSyncDetails } from "@/lib/catalog/sync";
import { serialize } from "@/lib/utils";
import { assertAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface CatalogSyncSummary {
  logId: string;
  totalFetched: number;
  created: number;
  updated: number;
  deactivated: number;
  failed: number;
}

/** "ซิงค์ตอนนี้": full reconcile, writes to the database. */
export async function triggerCatalogSync(): Promise<CatalogSyncSummary> {
  await assertAdmin();
  const result = await syncAll("MANUAL");
  revalidatePath("/website-sync");
  return serialize({
    logId: result.logId,
    totalFetched: result.totalFetched,
    created: result.created,
    updated: result.updated,
    deactivated: result.deactivated,
    failed: result.failed,
  });
}

/** "ตรวจสอบก่อนซิงค์": dry run, only a log row is written. */
export async function previewCatalogSync(): Promise<
  CatalogSyncSummary & { details: CatalogSyncDetails }
> {
  await assertAdmin();
  const result = await syncAll("MANUAL", { dryRun: true });
  revalidatePath("/website-sync");
  return serialize({
    logId: result.logId,
    totalFetched: result.totalFetched,
    created: result.created,
    updated: result.updated,
    deactivated: result.deactivated,
    failed: result.failed,
    details: result.details,
  });
}

// ============================================================
// MANUAL COLOR VARIANT CLEANUP
//
// Website-linked products (source = WEBSITE) sometimes ended up with colour
// rows that were typed in by hand before the matching website variant was
// synced, so the same colour shows twice in the picker: once as the
// website-owned row (websiteVariantId set) and once as the old manual entry.
// These two actions find and remove only the manual duplicates — never a
// website-owned row, and never a variant on a MANUAL (non-synced) product.
// ============================================================

export interface ManualColorVariantCleanupItem {
  productId: string;
  productName: string;
  productSku: string;
  variantId: string;
  variantName: string;
  stockQuantity: number;
}

export interface ManualColorVariantCleanupSummary {
  count: number;
  totalStockQuantity: number;
  items: ManualColorVariantCleanupItem[];
}

async function findManualColorVariantsOnWebsiteProducts() {
  return prisma.productColorVariant.findMany({
    where: {
      websiteVariantId: null,
      product: { source: "WEBSITE" },
    },
    select: {
      id: true,
      name: true,
      stockQuantity: true,
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
  });
}

/** Read-only: lists the manual colour rows that cleanupManualColorVariants would remove. */
export async function previewManualColorVariantCleanup(): Promise<ManualColorVariantCleanupSummary> {
  await assertAdmin();
  const variants = await findManualColorVariantsOnWebsiteProducts();
  return serialize({
    count: variants.length,
    totalStockQuantity: variants.reduce((sum, v) => sum + v.stockQuantity, 0),
    items: variants.map((v) => ({
      productId: v.product.id,
      productName: v.product.name,
      productSku: v.product.sku,
      variantId: v.id,
      variantName: v.name,
      stockQuantity: v.stockQuantity,
    })),
  });
}

/** Deletes manually-entered colour rows on website-linked products, keeping the website-owned ones. */
export async function cleanupManualColorVariants(): Promise<{ deleted: number }> {
  await assertAdmin();
  const variants = await findManualColorVariantsOnWebsiteProducts();
  const ids = variants.map((v) => v.id);
  if (ids.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { colorVariantId: { in: ids } } });
      await tx.productColorVariant.deleteMany({ where: { id: { in: ids } } });
    });
  }
  revalidatePath("/products");
  revalidatePath("/website-sync");
  return { deleted: ids.length };
}
