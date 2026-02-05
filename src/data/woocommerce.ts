import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getWooCommerceConfig() {
  const config = await prisma.wooCommerceConfig.findFirst();

  if (!config) return null;

  // Mask the consumer secret for display
  return serialize({
    ...config,
    consumerSecretMasked:
      config.consumerSecret.slice(0, 4) +
      "••••••••" +
      config.consumerSecret.slice(-4),
  });
}

export async function getWooCommerceConfigFull() {
  const data = await prisma.wooCommerceConfig.findFirst();
  return serialize(data);
}

export async function getWooCommerceSyncLogs(limit: number = 20) {
  const data = await prisma.wooCommerceSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return serialize(data);
}

export async function getLatestSyncLog(configId: string) {
  const data = await prisma.wooCommerceSyncLog.findFirst({
    where: { configId },
    orderBy: { startedAt: "desc" },
  });
  return serialize(data);
}
