"use server";

import { prisma } from "@/lib/prisma";
import { stockAdjustmentSchema, stockThresholdSchema } from "@/lib/validators";
import { requireUserAction, assertAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resolveStockCode as resolveStockCodeInternal } from "@/lib/stock-code";

// Re-exported so existing callers (document-actions.ts, shortage UI) keep compiling.
export type { StockShortage } from "@/data/stock-availability";

/**
 * Sync product.stockQuantity with sum of all variant stock quantities.
 * Call this after any variant-level stock mutation.
 */
async function syncProductStockFromVariants(tx: any, productId: string) {
  const result = await tx.productColorVariant.aggregate({
    where: { productId },
    _sum: { stockQuantity: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: result._sum.stockQuantity ?? 0 },
  });
}

/**
 * A product whose colours are tracked as variants must never receive a
 * product-level movement — Product.stockQuantity is a rollup SUM of its
 * variants and the next syncProductStockFromVariants call would silently
 * erase it.
 */
async function assertVariantRequiredIfAny(tx: any, productId: string, colorVariantId?: string) {
  if (colorVariantId) return;
  const variantCount = await tx.productColorVariant.count({ where: { productId } });
  if (variantCount > 0) {
    throw new Error("สินค้านี้มีตัวเลือกสี กรุณาเลือกสีก่อนปรับสต็อค");
  }
}

export async function addStock(data: unknown) {
  const validated = stockAdjustmentSchema.parse(data);
  const user = await requireUserAction();

  await prisma.$transaction(async (tx) => {
    await assertVariantRequiredIfAny(tx, validated.productId, validated.colorVariantId);

    if (validated.colorVariantId) {
      // Variant-level stock
      const variant = await tx.productColorVariant.findUniqueOrThrow({
        where: { id: validated.colorVariantId },
        select: { stockQuantity: true, productId: true },
      });

      const newBalance = variant.stockQuantity + validated.quantity;

      await tx.productColorVariant.update({
        where: { id: validated.colorVariantId },
        data: { stockQuantity: newBalance },
      });

      await tx.stockMovement.create({
        data: {
          productId: validated.productId,
          colorVariantId: validated.colorVariantId,
          type: "IN",
          quantity: validated.quantity,
          reason: validated.reason || null,
          reference: validated.reference || null,
          lotNumber: validated.lotNumber || null,
          balanceAfter: newBalance,
          createdById: user.id,
        },
      });

      await syncProductStockFromVariants(tx, validated.productId);
    } else {
      // Product-level stock (no variants)
      const product = await tx.product.findUniqueOrThrow({
        where: { id: validated.productId },
        select: { stockQuantity: true },
      });

      const newBalance = product.stockQuantity + validated.quantity;

      await tx.product.update({
        where: { id: validated.productId },
        data: { stockQuantity: newBalance },
      });

      await tx.stockMovement.create({
        data: {
          productId: validated.productId,
          type: "IN",
          quantity: validated.quantity,
          reason: validated.reason || null,
          reference: validated.reference || null,
          lotNumber: validated.lotNumber || null,
          balanceAfter: newBalance,
          createdById: user.id,
        },
      });
    }
  });

  revalidatePath("/stock");
}

export async function removeStock(data: unknown) {
  const validated = stockAdjustmentSchema.parse(data);
  const user = await requireUserAction();

  await prisma.$transaction(async (tx) => {
    await assertVariantRequiredIfAny(tx, validated.productId, validated.colorVariantId);

    if (validated.colorVariantId) {
      const variant = await tx.productColorVariant.findUniqueOrThrow({
        where: { id: validated.colorVariantId },
        select: { stockQuantity: true, productId: true },
      });

      if (variant.stockQuantity < validated.quantity) {
        throw new Error(`สต็อคไม่เพียงพอ (คงเหลือ ${variant.stockQuantity})`);
      }

      const newBalance = variant.stockQuantity - validated.quantity;

      await tx.productColorVariant.update({
        where: { id: validated.colorVariantId },
        data: { stockQuantity: newBalance },
      });

      await tx.stockMovement.create({
        data: {
          productId: validated.productId,
          colorVariantId: validated.colorVariantId,
          type: "OUT",
          quantity: validated.quantity,
          reason: validated.reason || null,
          reference: validated.reference || null,
          lotNumber: validated.lotNumber || null,
          balanceAfter: newBalance,
          createdById: user.id,
        },
      });

      await syncProductStockFromVariants(tx, validated.productId);
    } else {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: validated.productId },
        select: { stockQuantity: true },
      });

      if (product.stockQuantity < validated.quantity) {
        throw new Error(`สต็อคไม่เพียงพอ (คงเหลือ ${product.stockQuantity})`);
      }

      const newBalance = product.stockQuantity - validated.quantity;

      await tx.product.update({
        where: { id: validated.productId },
        data: { stockQuantity: newBalance },
      });

      await tx.stockMovement.create({
        data: {
          productId: validated.productId,
          type: "OUT",
          quantity: validated.quantity,
          reason: validated.reason || null,
          reference: validated.reference || null,
          lotNumber: validated.lotNumber || null,
          balanceAfter: newBalance,
          createdById: user.id,
        },
      });
    }
  });

  revalidatePath("/stock");
}

export async function adjustStock(
  productId: string,
  newQuantity: number,
  reason?: string,
  colorVariantId?: string
) {
  const user = await requireUserAction();

  await prisma.$transaction(async (tx) => {
    await assertVariantRequiredIfAny(tx, productId, colorVariantId);

    if (colorVariantId) {
      const variant = await tx.productColorVariant.findUniqueOrThrow({
        where: { id: colorVariantId },
        select: { stockQuantity: true },
      });

      const delta = newQuantity - variant.stockQuantity;
      if (delta === 0) return;

      await tx.productColorVariant.update({
        where: { id: colorVariantId },
        data: { stockQuantity: newQuantity },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          colorVariantId,
          type: "ADJUSTMENT",
          quantity: Math.abs(delta),
          reason: reason || `ปรับยอดจาก ${variant.stockQuantity} เป็น ${newQuantity}`,
          balanceAfter: newQuantity,
          createdById: user.id,
        },
      });

      await syncProductStockFromVariants(tx, productId);
    } else {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stockQuantity: true },
      });

      const delta = newQuantity - product.stockQuantity;
      if (delta === 0) return;

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          type: "ADJUSTMENT",
          quantity: Math.abs(delta),
          reason: reason || `ปรับยอดจาก ${product.stockQuantity} เป็น ${newQuantity}`,
          balanceAfter: newQuantity,
          createdById: user.id,
        },
      });
    }
  });

  revalidatePath("/stock");
}

export async function updateStockThreshold(
  productId: string,
  threshold: number,
  colorVariantId?: string
) {
  const validated = stockThresholdSchema.parse({
    productId,
    colorVariantId,
    lowStockThreshold: threshold,
  });

  if (validated.colorVariantId) {
    await prisma.productColorVariant.update({
      where: { id: validated.colorVariantId },
      data: { lowStockThreshold: validated.lowStockThreshold },
    });
  } else {
    await prisma.product.update({
      where: { id: validated.productId },
      data: { lowStockThreshold: validated.lowStockThreshold },
    });
  }

  revalidatePath("/stock");
}

export async function resolveStockCodeAction(code: string) {
  return resolveStockCodeInternal(code);
}

/**
 * Rebuilds Product.stockQuantity as the sum of its variants' stock, for
 * every product that has variants. Heals rollups left stale by any bug in
 * the variant-mutation paths (see CLAUDE.md / the stock plan for context).
 */
export async function recalculateStockRollups() {
  await assertAdmin();

  const products = await prisma.product.findMany({
    where: { colorVariants: { some: {} } },
    select: { id: true },
  });

  let updated = 0;
  for (const product of products) {
    const result = await prisma.productColorVariant.aggregate({
      where: { productId: product.id },
      _sum: { stockQuantity: true },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { stockQuantity: result._sum.stockQuantity ?? 0 },
    });
    updated++;
  }

  revalidatePath("/stock");
  return { updated };
}
