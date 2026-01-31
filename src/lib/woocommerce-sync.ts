import { prisma } from "./prisma";
import { getAllProducts, type WooCommerceClientConfig } from "./woocommerce";
import {
  mapWooCommerceProduct,
  resolveCategory,
  resolveSku,
} from "./woocommerce-mapper";
import { generateProductSku } from "./sku-generator";
import { revalidatePath } from "next/cache";
import type { SyncTrigger } from "@/generated/prisma/client";

interface SyncResult {
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export async function syncWooCommerceProducts(
  configId: string,
  trigger: SyncTrigger
): Promise<SyncResult> {
  // Load config
  const config = await prisma.wooCommerceConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error("WooCommerce config not found");
  }

  // Check for already-running sync
  const running = await prisma.wooCommerceSyncLog.findFirst({
    where: { configId, status: "RUNNING" },
  });

  if (running) {
    // Mark stale running syncs older than 30 minutes as failed
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (running.startedAt < thirtyMinAgo) {
      await prisma.wooCommerceSyncLog.update({
        where: { id: running.id },
        data: {
          status: "FAILED",
          errorMessage: "Sync timed out (exceeded 30 minutes)",
          completedAt: new Date(),
        },
      });
    } else {
      throw new Error("A sync is already running. Please wait for it to complete.");
    }
  }

  // Create sync log
  const syncLog = await prisma.wooCommerceSyncLog.create({
    data: {
      configId,
      status: "RUNNING",
      trigger,
    },
  });

  const result: SyncResult = {
    totalFetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Fetch all WC products
    const clientConfig: WooCommerceClientConfig = {
      storeUrl: config.storeUrl,
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
    };

    const wcProducts = await getAllProducts(clientConfig);
    result.totalFetched = wcProducts.length;

    // Load existing WC-synced products indexed by woocommerceId
    const existingProducts = await prisma.product.findMany({
      where: { source: "WOOCOMMERCE" },
      select: { id: true, woocommerceId: true, sku: true },
    });

    const existingByWcId = new Map(
      existingProducts
        .filter((p) => p.woocommerceId !== null)
        .map((p) => [p.woocommerceId!, p])
    );

    const processedWcIds = new Set<number>();

    for (const wcProduct of wcProducts) {
      try {
        const mapped = mapWooCommerceProduct(wcProduct);
        processedWcIds.add(mapped.woocommerceId);

        // Resolve category
        const categoryId = await resolveCategory(mapped.wcCategoryName);

        // Resolve SKU
        let sku = await resolveSku(mapped.sku, mapped.woocommerceId);

        const existing = existingByWcId.get(mapped.woocommerceId);

        if (existing) {
          // Update existing product
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: mapped.name,
              description: mapped.description,
              imageUrl: mapped.imageUrl,
              basePrice: mapped.basePrice,
              status: mapped.status,
              width: mapped.width,
              height: mapped.height,
              categoryId,
              // Only update SKU if we have a resolved one and it's different
              ...(sku && sku !== existing.sku ? { sku } : {}),
            },
          });
          result.updated++;
        } else {
          // Create new product
          if (!sku) {
            // Auto-generate SKU if we have a category
            if (categoryId) {
              sku = await prisma.$transaction(async (tx) =>
                generateProductSku(categoryId, tx)
              );
            } else {
              // Fallback SKU
              sku = `WC-${mapped.woocommerceId}`;
            }
          }

          await prisma.product.create({
            data: {
              name: mapped.name,
              sku,
              description: mapped.description,
              imageUrl: mapped.imageUrl,
              basePrice: mapped.basePrice,
              status: mapped.status,
              width: mapped.width,
              height: mapped.height,
              categoryId,
              woocommerceId: mapped.woocommerceId,
              source: "WOOCOMMERCE",
            },
          });
          result.created++;
        }
      } catch (err) {
        result.failed++;
        console.error(
          `Failed to sync WC product ${wcProduct.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // Soft-delete products no longer in WooCommerce
    const removedProducts = existingProducts.filter(
      (p) => p.woocommerceId !== null && !processedWcIds.has(p.woocommerceId)
    );

    if (removedProducts.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: removedProducts.map((p) => p.id) } },
        data: { status: "INACTIVE" },
      });
      result.skipped += removedProducts.length;
    }

    // Update sync log with success
    await prisma.wooCommerceSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "COMPLETED",
        totalFetched: result.totalFetched,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        completedAt: new Date(),
      },
    });

    // Update last sync timestamp
    await prisma.wooCommerceConfig.update({
      where: { id: configId },
      data: { lastSyncAt: new Date() },
    });
  } catch (err) {
    // Update sync log with failure
    await prisma.wooCommerceSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "FAILED",
        totalFetched: result.totalFetched,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
    throw err;
  }

  revalidatePath("/products");
  revalidatePath("/woocommerce");

  return result;
}
