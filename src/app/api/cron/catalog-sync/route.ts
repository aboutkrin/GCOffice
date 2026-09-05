import { NextResponse } from "next/server";

import { syncAll } from "@/lib/catalog/sync";

/**
 * GET /api/cron/catalog-sync — nightly full reconcile, scheduled in vercel.json.
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Excluded from the
 * Supabase auth middleware (see middleware.ts).
 */

export const dynamic = "force-dynamic";
// 300s needs a Pro plan; Hobby caps at 60s. A full run of ~260 products is
// expected to finish well inside a minute.
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAll("SCHEDULED");
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
