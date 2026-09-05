import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getCatalogSyncLogs(limit: number = 20) {
  try {
    const data = await prisma.catalogSyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return serialize(data);
  } catch {
    return [];
  }
}

/** Most recent successful, non-dry-run sync (any scope). */
export async function getLastCompletedSync() {
  try {
    const data = await prisma.catalogSyncLog.findFirst({
      where: { status: "COMPLETED", dryRun: false },
      orderBy: { completedAt: "desc" },
    });
    return serialize(data);
  } catch {
    return null;
  }
}

export async function getWebsiteProductCount() {
  try {
    const [total, active] = await Promise.all([
      prisma.product.count({ where: { source: "WEBSITE" } }),
      prisma.product.count({ where: { source: "WEBSITE", status: "ACTIVE" } }),
    ]);
    return { total, active };
  } catch {
    return { total: 0, active: 0 };
  }
}
