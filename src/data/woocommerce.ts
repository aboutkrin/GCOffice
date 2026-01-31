import { prisma } from "@/lib/prisma";

export async function getWooCommerceConfig() {
  const config = await prisma.wooCommerceConfig.findFirst();

  if (!config) return null;

  // Mask the consumer secret for display
  return {
    ...config,
    consumerSecretMasked:
      config.consumerSecret.slice(0, 4) +
      "••••••••" +
      config.consumerSecret.slice(-4),
  };
}

export async function getWooCommerceConfigFull() {
  return prisma.wooCommerceConfig.findFirst();
}

export async function getWooCommerceSyncLogs(limit: number = 20) {
  return prisma.wooCommerceSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export async function getLatestSyncLog(configId: string) {
  return prisma.wooCommerceSyncLog.findFirst({
    where: { configId },
    orderBy: { startedAt: "desc" },
  });
}
