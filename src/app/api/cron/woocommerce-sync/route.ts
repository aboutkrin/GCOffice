import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncWooCommerceProducts } from "@/lib/woocommerce-sync";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find active config with auto-sync enabled
  const config = await prisma.wooCommerceConfig.findFirst({
    where: { autoSyncEnabled: true },
  });

  if (!config) {
    return NextResponse.json({
      message: "No active WooCommerce config with auto-sync enabled",
    });
  }

  try {
    const result = await syncWooCommerceProducts(config.id, "SCHEDULED");
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
