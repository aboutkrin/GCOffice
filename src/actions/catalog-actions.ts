"use server";

import { revalidatePath } from "next/cache";

import { syncAll, type CatalogSyncDetails } from "@/lib/catalog/sync";
import { serialize } from "@/lib/utils";

export interface CatalogSyncSummary {
  logId: string;
  totalFetched: number;
  created: number;
  updated: number;
  deactivated: number;
  failed: number;
}

/** "ซิงค์ตอนนี้": full reconcile, writes to the database. */
export async function triggerCatalogSync(): Promise<CatalogSyncSummary> {
  const result = await syncAll("MANUAL");
  revalidatePath("/website-sync");
  return serialize({
    logId: result.logId,
    totalFetched: result.totalFetched,
    created: result.created,
    updated: result.updated,
    deactivated: result.deactivated,
    failed: result.failed,
  });
}

/** "ตรวจสอบก่อนซิงค์": dry run, only a log row is written. */
export async function previewCatalogSync(): Promise<
  CatalogSyncSummary & { details: CatalogSyncDetails }
> {
  const result = await syncAll("MANUAL", { dryRun: true });
  revalidatePath("/website-sync");
  return serialize({
    logId: result.logId,
    totalFetched: result.totalFetched,
    created: result.created,
    updated: result.updated,
    deactivated: result.deactivated,
    failed: result.failed,
    details: result.details,
  });
}
