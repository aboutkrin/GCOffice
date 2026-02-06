import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getWooCommerceConfig() {
  try {
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
  } catch {
    return null;
  }
}

export async function getWooCommerceConfigFull() {
  try {
    const data = await prisma.wooCommerceConfig.findFirst();
    return serialize(data);
  } catch {
    return null;
  }
}

export async function getWooCommerceSyncLogs(limit: number = 20) {
  try {
    const data = await prisma.wooCommerceSyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getLatestSyncLog(configId: string) {
  try {
    const data = await prisma.wooCommerceSyncLog.findFirst({
      where: { configId },
      orderBy: { startedAt: "desc" },
    });
    return serialize(data);
  } catch {
    return null;
  }
}
