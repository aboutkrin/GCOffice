"use server";

import { prisma } from "@/lib/prisma";
import { wooCommerceConfigSchema } from "@/lib/validators";
import { testConnection } from "@/lib/woocommerce";
import { syncWooCommerceProducts } from "@/lib/woocommerce-sync";
import { revalidatePath } from "next/cache";

export async function saveWooCommerceConfig(data: unknown) {
  const validated = wooCommerceConfigSchema.parse(data);

  // Upsert: only one config is supported
  const existing = await prisma.wooCommerceConfig.findFirst();

  if (existing) {
    const updated = await prisma.wooCommerceConfig.update({
      where: { id: existing.id },
      data: {
        storeUrl: validated.storeUrl,
        consumerKey: validated.consumerKey,
        consumerSecret: validated.consumerSecret,
        autoSyncEnabled: validated.autoSyncEnabled,
      },
    });
    revalidatePath("/woocommerce");
    return updated;
  }

  const created = await prisma.wooCommerceConfig.create({
    data: {
      storeUrl: validated.storeUrl,
      consumerKey: validated.consumerKey,
      consumerSecret: validated.consumerSecret,
      autoSyncEnabled: validated.autoSyncEnabled,
    },
  });
  revalidatePath("/woocommerce");
  return created;
}

export async function testWooCommerceConnection(configId: string) {
  const config = await prisma.wooCommerceConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error("ไม่พบการตั้งค่า WooCommerce");
  }

  await testConnection({
    storeUrl: config.storeUrl,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
  });

  return { success: true };
}

export async function triggerWooCommerceSync(configId: string) {
  const result = await syncWooCommerceProducts(configId, "MANUAL");
  return result;
}

export async function deleteWooCommerceConfig(configId: string) {
  await prisma.wooCommerceConfig.delete({
    where: { id: configId },
  });
  revalidatePath("/woocommerce");
}
