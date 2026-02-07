"use server";

import { prisma } from "@/lib/prisma";
import { vendorCostSchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { ensureVendorCostTables } from "@/data/vendor-costs";

export async function createVendorCost(data: unknown) {
  try {
    await ensureVendorCostTables();
    const validated = vendorCostSchema.parse(data);

    const itemsTotal = validated.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCost = itemsTotal + validated.shippingCost;

    const vendorCost = await prisma.vendorCost.create({
      data: {
        documentId: validated.documentId || null,
        vendorName: validated.vendorName,
        orderNumber: validated.orderNumber || null,
        orderDate: validated.orderDate,
        exchangeRate: validated.exchangeRate ?? null,
        shippingCost: validated.shippingCost,
        otherCost: 0,
        totalCost,
        shippingProvider: validated.shippingProvider,
        paymentMethod: validated.paymentMethod,
        paymentMethodNote: validated.paymentMethodNote || null,
        shippingPaymentMethod: validated.shippingPaymentMethod,
        shippingPaymentMethodNote: validated.shippingPaymentMethodNote || null,
        notes: validated.notes || null,
        items: {
          create: validated.items.map((item) => ({
            sequence: item.sequence,
            productName: item.productName,
            productSku: item.productSku || null,
            quantity: item.quantity,
            unitCostCny: item.unitCostCny ?? null,
            unitCostRate: item.unitCostRate ?? null,
            unitCost: item.unitCost,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });

    revalidatePath("/vendor-costs");
    return serialize(vendorCost);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถบันทึกต้นทุนใบสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function updateVendorCost(id: string, data: unknown) {
  try {
    const validated = vendorCostSchema.parse(data);

    const itemsTotal = validated.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCost = itemsTotal + validated.shippingCost;

    const vendorCost = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.vendorCostItem.deleteMany({
        where: { vendorCostId: id },
      });

      // Update vendor cost and create new items
      return tx.vendorCost.update({
        where: { id },
        data: {
          documentId: validated.documentId || null,
          vendorName: validated.vendorName,
          orderNumber: validated.orderNumber || null,
          orderDate: validated.orderDate,
          exchangeRate: validated.exchangeRate ?? null,
          shippingCost: validated.shippingCost,
          otherCost: 0,
          totalCost,
          shippingProvider: validated.shippingProvider,
          paymentMethod: validated.paymentMethod,
          paymentMethodNote: validated.paymentMethodNote || null,
          shippingPaymentMethod: validated.shippingPaymentMethod,
          shippingPaymentMethodNote: validated.shippingPaymentMethodNote || null,
          notes: validated.notes || null,
          items: {
            create: validated.items.map((item) => ({
              sequence: item.sequence,
              productName: item.productName,
              productSku: item.productSku || null,
              quantity: item.quantity,
              unitCostCny: item.unitCostCny ?? null,
              unitCostRate: item.unitCostRate ?? null,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });
    });

    revalidatePath("/vendor-costs");
    return serialize(vendorCost);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถบันทึกต้นทุนใบสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function deleteVendorCost(id: string) {
  try {
    await prisma.vendorCost.delete({
      where: { id },
    });
    revalidatePath("/vendor-costs");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถลบต้นทุนใบสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}
