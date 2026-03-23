"use server";

import { prisma } from "@/lib/prisma";
import { stockAdjustmentSchema, stockThresholdSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function addStock(data: unknown) {
  const validated = stockAdjustmentSchema.parse(data);

  await prisma.$transaction(async (tx) => {
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
        balanceAfter: newBalance,
      },
    });
  });

  revalidatePath("/stock");
}

export async function removeStock(data: unknown) {
  const validated = stockAdjustmentSchema.parse(data);

  await prisma.$transaction(async (tx) => {
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
  });

  revalidatePath("/stock");
}

export async function adjustStock(
  productId: string,
  newQuantity: number,
  reason?: string
) {
  await prisma.$transaction(async (tx) => {
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
  });

  revalidatePath("/stock");
}

export async function updateStockThreshold(productId: string, threshold: number) {
  const validated = stockThresholdSchema.parse({
    productId,
    lowStockThreshold: threshold,
  });

  await prisma.product.update({
    where: { id: validated.productId },
    data: { lowStockThreshold: validated.lowStockThreshold },
  });

  revalidatePath("/stock");
}
