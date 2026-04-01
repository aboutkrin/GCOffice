"use server";

import { prisma } from "@/lib/prisma";
import { stockAdjustmentSchema, stockThresholdSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

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

export async function addStock(data: unknown) {
  const validated = stockAdjustmentSchema.parse(data);

  await prisma.$transaction(async (tx) => {
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
        },
      });
    }
  });

  revalidatePath("/stock");
}

export async function removeStock(data: unknown) {
  const validated = stockAdjustmentSchema.parse(data);

  await prisma.$transaction(async (tx) => {
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
          balanceAfter: newBalance,
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
          balanceAfter: newBalance,
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
  await prisma.$transaction(async (tx) => {
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
        },
      });
    }
  });

  revalidatePath("/stock");
}

// ============================================================
// Document-driven stock deduction & restore
// ============================================================

export interface StockShortage {
  productSku: string;
  productName: string;
  colorVariantName: string | null;
  requested: number;
  available: number;
  shortage: number;
}

/**
 * Deduct stock for every line item in a document.
 * If stock is insufficient, deducts what's available and tracks shortages.
 */
export async function deductStockForDocument(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { lineItems: { orderBy: { sequence: "asc" } } },
  });

  const shortages: StockShortage[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of document.lineItems) {
      if (!item.productSku) continue;

      const product = await tx.product.findUnique({
        where: { sku: item.productSku },
        select: {
          id: true,
          stockQuantity: true,
          colorVariants: {
            select: { id: true, name: true, stockQuantity: true },
          },
        },
      });
      if (!product) continue;

      const reason = `ตัดสต็อคจากเอกสาร ${document.documentNumber}`;
      const reference = document.documentNumber;

      if (item.colorVariantName) {
        const variant = product.colorVariants.find(
          (v) => v.name === item.colorVariantName
        );
        if (!variant) continue;

        const deductQty = Math.min(item.quantity, variant.stockQuantity);
        if (item.quantity > variant.stockQuantity) {
          shortages.push({
            productSku: item.productSku,
            productName: item.productName,
            colorVariantName: item.colorVariantName,
            requested: item.quantity,
            available: variant.stockQuantity,
            shortage: item.quantity - variant.stockQuantity,
          });
        }

        if (deductQty > 0) {
          const newBalance = variant.stockQuantity - deductQty;
          await tx.productColorVariant.update({
            where: { id: variant.id },
            data: { stockQuantity: newBalance },
          });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              colorVariantId: variant.id,
              type: "OUT",
              quantity: deductQty,
              reason,
              reference,
              balanceAfter: newBalance,
            },
          });
          await syncProductStockFromVariants(tx, product.id);
        }
      } else {
        const deductQty = Math.min(item.quantity, product.stockQuantity);
        if (item.quantity > product.stockQuantity) {
          shortages.push({
            productSku: item.productSku,
            productName: item.productName,
            colorVariantName: null,
            requested: item.quantity,
            available: product.stockQuantity,
            shortage: item.quantity - product.stockQuantity,
          });
        }

        if (deductQty > 0) {
          const newBalance = product.stockQuantity - deductQty;
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: newBalance },
          });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "OUT",
              quantity: deductQty,
              reason,
              reference,
              balanceAfter: newBalance,
            },
          });
        }
      }
    }
  });

  revalidatePath("/stock");
  return { success: true, shortages };
}

/**
 * Restore stock that was previously deducted for a document.
 * Finds all OUT movements referencing the document number and reverses them.
 */
export async function restoreStockForDocument(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    select: { documentNumber: true },
  });

  const movements = await prisma.stockMovement.findMany({
    where: {
      reference: document.documentNumber,
      type: "OUT",
    },
  });

  if (movements.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const syncProductIds = new Set<string>();

    for (const movement of movements) {
      const reason = `คืนสต็อคจากการยกเลิกเอกสาร ${document.documentNumber}`;

      if (movement.colorVariantId) {
        const variant = await tx.productColorVariant.findUnique({
          where: { id: movement.colorVariantId },
          select: { stockQuantity: true },
        });
        if (!variant) continue;

        const newBalance = variant.stockQuantity + movement.quantity;
        await tx.productColorVariant.update({
          where: { id: movement.colorVariantId },
          data: { stockQuantity: newBalance },
        });
        await tx.stockMovement.create({
          data: {
            productId: movement.productId,
            colorVariantId: movement.colorVariantId,
            type: "IN",
            quantity: movement.quantity,
            reason,
            reference: document.documentNumber,
            balanceAfter: newBalance,
          },
        });
        syncProductIds.add(movement.productId);
      } else {
        const product = await tx.product.findUnique({
          where: { id: movement.productId },
          select: { stockQuantity: true },
        });
        if (!product) continue;

        const newBalance = product.stockQuantity + movement.quantity;
        await tx.product.update({
          where: { id: movement.productId },
          data: { stockQuantity: newBalance },
        });
        await tx.stockMovement.create({
          data: {
            productId: movement.productId,
            type: "IN",
            quantity: movement.quantity,
            reason,
            reference: document.documentNumber,
            balanceAfter: newBalance,
          },
        });
      }
    }

    for (const productId of syncProductIds) {
      await syncProductStockFromVariants(tx, productId);
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
