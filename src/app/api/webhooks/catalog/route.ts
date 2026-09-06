import { NextResponse, after } from "next/server";
import { z } from "zod";

import { cleanEnv } from "@/lib/catalog/client";
import { verifyCatalogSignature } from "@/lib/catalog/signature";
import { markWebsiteProductsDeleted, syncProductIds } from "@/lib/catalog/sync";
import {
  CATALOG_SIGNATURE_HEADER,
  CATALOG_WEBHOOK_MAX_IDS,
  type CatalogWebhookPayload,
} from "@/lib/catalog/types";

/**
 * POST /api/webhooks/catalog — called by goodchoiceth.com after a product
 * changes. Excluded from the Supabase auth middleware (see middleware.ts);
 * authenticated by the HMAC signature in `X-GC-Signature` instead.
 *
 * The payload carries ids only; the sync re-fetches each product so a replayed
 * or out-of-order event can never write stale data. Work runs in `after()` so
 * the website gets its 202 immediately.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const payloadSchema = z.object({
  id: z.string().min(1),
  event: z.enum(["product.updated", "product.deleted"]),
  productIds: z.array(z.number().int().positive()).max(CATALOG_WEBHOOK_MAX_IDS),
  occurredAt: z.string().min(1),
}) satisfies z.ZodType<CatalogWebhookPayload>;

export async function POST(request: Request) {
  const secret = cleanEnv("CATALOG_API_KEY");
  if (!secret) {
    return NextResponse.json(
      { error: "CATALOG_API_KEY is not configured" },
      { status: 503 }
    );
  }

  // Verify the raw body: any re-serialisation would break the signature.
  const rawBody = await request.text();
  const verification = verifyCatalogSignature(
    rawBody,
    request.headers.get(CATALOG_SIGNATURE_HEADER),
    secret
  );
  if (!verification.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: verification.reason },
      { status: 401 }
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id, event, productIds } = parsed.data;

  if (productIds.length > 0) {
    after(async () => {
      try {
        if (event === "product.deleted") {
          await markWebsiteProductsDeleted(productIds);
        } else {
          await syncProductIds(productIds, "WEBHOOK");
        }
      } catch (err) {
        console.error(
          `[catalog-webhook] ${event} ${id} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    });
  }

  return NextResponse.json(
    { ok: true, received: productIds.length },
    { status: 202 }
  );
}
