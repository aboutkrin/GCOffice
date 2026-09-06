import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC signature for the GCOffice webhook. Copied verbatim into GCOffice at
 * `src/lib/catalog/signature.ts`.
 *
 * Header format: `t=<unixSeconds>,v1=<hex>` where
 * `v1 = HMAC-SHA256(secret, `${t}.${rawBody}`)`. Including the timestamp in
 * the signed string means a captured request cannot be replayed once it is
 * older than the tolerance window.
 */

export const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;

export function signCatalogWebhook(
  rawBody: string,
  secret: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${rawBody}`)
    .digest("hex");
  return `t=${timestampSeconds},v1=${digest}`;
}

export type SignatureVerification =
  | { ok: true; timestampSeconds: number }
  | { ok: false; reason: "missing" | "malformed" | "expired" | "mismatch" };

export function verifyCatalogSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = DEFAULT_SIGNATURE_TOLERANCE_SECONDS
): SignatureVerification {
  if (!header) return { ok: false, reason: "missing" };

  let timestampSeconds: number | null = null;
  let provided: string | null = null;
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t" && value && /^\d+$/.test(value)) {
      timestampSeconds = Number(value);
    } else if (key === "v1" && value && /^[0-9a-f]{64}$/i.test(value)) {
      provided = value.toLowerCase();
    }
  }
  if (timestampSeconds === null || provided === null) {
    return { ok: false, reason: "malformed" };
  }

  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) {
    return { ok: false, reason: "expired" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true, timestampSeconds };
}

/**
 * Constant-time comparison of two secrets of possibly different length.
 * Hashing both first makes the buffers equal-length so `timingSafeEqual`
 * never throws and never leaks the length of the real key.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
