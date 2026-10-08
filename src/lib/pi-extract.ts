import "server-only";

import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

/**
 * Reads a Chinese supplier proforma invoice (PI) image into structured lines
 * through Vercel AI Gateway, with open-weight vision models only.
 * - PI_EXTRACT_MODEL: primary gateway "provider/model" id (needs vision + structured output)
 * - PI_EXTRACT_FALLBACK_MODELS: comma-separated ids the gateway tries in order
 *   when the primary fails or is unavailable ("" disables fallback)
 * Auth: AI_GATEWAY_API_KEY, or the Vercel OIDC token when deployed on Vercel.
 *
 * Open models often break the JSON contract (numbers as "¥630.00", text around
 * the JSON), so numbers are accepted as strings and cleaned here, a failed
 * structured answer is parsed from its raw text, and as a last resort the next
 * model is asked again for plain JSON.
 */
export const DEFAULT_PI_MODEL = "google/gemma-4-31b-it";
export const DEFAULT_PI_FALLBACK_MODELS = ["alibaba/qwen3.8-27b"];

/** Per model attempt; the page allows 300s in total */
const ATTEMPT_TIMEOUT_MS = 120_000;

function fallbackModels(): string[] {
  const raw = process.env.PI_EXTRACT_FALLBACK_MODELS;
  if (raw == null) return DEFAULT_PI_FALLBACK_MODELS;
  return raw.split(",").map((m) => m.trim()).filter(Boolean);
}

/** A number, or a string like "¥1,470.00" that is cleaned in cleanExtractedPi */
const looseNumber = z.union([z.number(), z.string()]).nullable();

const piSchema = z.object({
  supplierName: z.string().nullable().describe("Seller / factory company name"),
  piNumber: z.string().nullable().describe("PI No. / invoice number"),
  piDate: z.string().nullable().describe("Invoice date as YYYY-MM-DD"),
  items: z
    .array(
      z.object({
        supplierCode: z.string().nullable().describe("Item No. / model code exactly as printed, e.g. YSP125-Q304"),
        description: z.string().nullable().describe("Short description: size, material"),
        boxes: looseNumber.describe("Number of boxes / cartons (CTNS, /box column)"),
        sqm: looseNumber.describe("Square metres (M2 / m² column)"),
        unitPrice: looseNumber.describe("Unit price in CNY (often per m²)"),
        amount: looseNumber.describe("Line amount in CNY (Amount column)"),
        weightKg: looseNumber.describe("Gross weight of the whole line in kg (G.W. / Weight KG)"),
      })
    )
    .describe("Product lines only"),
  fees: z
    .array(
      z.object({
        label: z.string().nullable().describe("e.g. Pallet fee, Shipping cost to agent's warehouse"),
        amount: looseNumber.describe("Fee amount in CNY (the amount column, not the unit price)"),
      })
    )
    .describe("Extra charges that are not products"),
  totalAmount: looseNumber.describe("Grand TOTAL in CNY printed on the invoice"),
});

type RawPi = z.infer<typeof piSchema>;

export interface ExtractedPi {
  supplierName: string | null;
  piNumber: string | null;
  piDate: string | null;
  items: {
    supplierCode: string;
    description: string | null;
    boxes: number;
    sqm: number | null;
    unitPrice: number | null;
    amount: number;
    weightKg: number | null;
  }[];
  fees: { label: string; amount: number }[];
  totalAmount: number | null;
}

const INSTRUCTIONS = `You read Chinese ceramic-tile supplier proforma invoices (PI) and return the table as JSON.
A PI has product rows (bought by the box/carton) and, below them, China-side charges such as a pallet fee and the
shipping cost from the factory to our agent's warehouse in Guangzhou.
Rules:
- One entry in "items" per product row. supplierCode = the Item No./model code exactly as printed (keep dashes).
- boxes = number of boxes/cartons (columns like "/box", "CTNS", "Quantity box"). Never use pieces, pallets or m² as boxes.
- amount = the line Amount in CNY (RMB). If a row only shows unit price and m², amount = unit price × m².
- weightKg = gross weight for the whole row in kg (G.W. / Weight KG column), null if the PI has no weight column.
- Rows like "Freight", "The pallet fee", "Shipping cost to agent's warehouse", "运费", "托盘费" are fees, not items,
  even when they carry a Chinese address. Use their amount column (not the unit price).
- Ignore TOTAL, deposit/received payment and Balance rows, bank information and the shipping address.
- totalAmount = the grand TOTAL in CNY printed on the PI (before deposits), null if absent.
- piDate as YYYY-MM-DD (e.g. "Oct. 8th, 2026" → 2026-10-08, "02/Oct/26" → 2026-10-02).
- Numbers must be plain numbers without currency symbols or thousands separators.
- When several images are given they are consecutive pages, or overlapping slices of one long page from top to
  bottom: a row that appears in two slices must be returned only once.`;

const JSON_SHAPE = `Reply with ONLY one JSON object, no markdown, in exactly this shape:
{"supplierName":string|null,"piNumber":string|null,"piDate":"YYYY-MM-DD"|null,
 "items":[{"supplierCode":string,"description":string|null,"boxes":number,"sqm":number|null,"unitPrice":number|null,"amount":number,"weightKg":number|null}],
 "fees":[{"label":string,"amount":number}],
 "totalAmount":number|null}`;

export class PiExtractConfigError extends Error {}

type Page = { image: Uint8Array; mediaType: string };

function userMessage(pages: Page[], extra = "") {
  return {
    role: "user" as const,
    content: [
      {
        type: "text" as const,
        text:
          (pages.length > 1
            ? `Extract this proforma invoice. It comes as ${pages.length} images, in order; return one combined result.`
            : "Extract this proforma invoice.") + extra,
      },
      ...pages.map((p) => ({ type: "file" as const, data: p.image, mediaType: p.mediaType })),
    ],
  };
}

/** First {...} block of a model answer (skips ```json fences and chatter). */
export function parseJsonLoose(text: string | undefined): unknown {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** `pages`: one image per PI page (a photo, its slices, or each page of a PDF rendered in the browser). */
export async function extractProformaInvoice(pages: Page[]): Promise<ExtractedPi> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new PiExtractConfigError(
      "ยังไม่ได้ตั้งค่า AI_GATEWAY_API_KEY สำหรับอ่านใบ PI อัตโนมัติ กรุณากรอกหรือวางข้อมูลเอง"
    );
  }

  const primary = process.env.PI_EXTRACT_MODEL || DEFAULT_PI_MODEL;
  const fallbacks = fallbackModels();

  // 1) Structured output; the gateway itself retries on the fallback models
  let raw: unknown = null;
  try {
    const { output } = await generateText({
      model: primary,
      output: Output.object({ schema: piSchema, name: "proforma_invoice" }),
      system: INSTRUCTIONS,
      messages: [userMessage(pages)],
      temperature: 0,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      providerOptions: { gateway: { models: fallbacks } },
    });
    raw = output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      raw = parseJsonLoose(error.text);
      console.warn("PI structured output invalid, parsed raw text:", raw != null, error.cause);
    } else {
      console.error(`PI extraction with ${primary} failed:`, error);
    }
  }

  // 2) Plain JSON answer from the next model when the first try gave nothing usable
  let parsed = piSchema.safeParse(raw);
  if (!parsed.success || parsed.data.items.length === 0) {
    const model = fallbacks[0] ?? primary;
    const { text } = await generateText({
      model,
      system: `${INSTRUCTIONS}\n\n${JSON_SHAPE}`,
      messages: [userMessage(pages, "\nReturn only the JSON object.")],
      temperature: 0,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      providerOptions: { gateway: { models: fallbacks.filter((m) => m !== model) } },
    });
    const retry = piSchema.safeParse(parseJsonLoose(text));
    if (retry.success) parsed = retry;
    else console.error(`PI plain JSON from ${model} invalid:`, retry.error.issues.slice(0, 3), text.slice(0, 500));
  }
  if (!parsed.success) throw new Error("PI extraction returned no valid JSON");

  return cleanExtractedPi(parsed.data, pages.length > 1);
}

/** "¥1,470.00" → 1470; null for anything that is not a finite number. */
export function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = v.replace(/[^\d.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function cleanExtractedPi(pi: RawPi, multiImage: boolean): ExtractedPi {
  const seen = new Set<string>();
  const items: ExtractedPi["items"] = [];
  for (const it of pi.items) {
    const code = it.supplierCode?.trim();
    if (!code) continue;
    const sqm = toNumber(it.sqm);
    const unitPrice = toNumber(it.unitPrice);
    let amount = toNumber(it.amount) ?? 0;
    if (amount <= 0 && unitPrice != null && sqm != null) amount = Math.round(unitPrice * sqm * 100) / 100;
    const boxes = Math.max(0, Math.round(toNumber(it.boxes) ?? 0));
    // Overlapping slices of a long image can return the same row twice
    const dupKey = `${code.toUpperCase()}|${boxes}|${amount}`;
    if (multiImage && seen.has(dupKey)) continue;
    seen.add(dupKey);
    items.push({
      supplierCode: code,
      description: it.description?.trim() || null,
      boxes,
      sqm,
      unitPrice,
      amount,
      weightKg: toNumber(it.weightKg),
    });
  }

  const feeSeen = new Set<string>();
  const fees: ExtractedPi["fees"] = [];
  for (const f of pi.fees) {
    const amount = toNumber(f.amount);
    if (amount == null || amount === 0) continue;
    const label = f.label?.trim() || "ค่าใช้จ่าย";
    const dupKey = `${label.toUpperCase()}|${amount}`;
    if (multiImage && feeSeen.has(dupKey)) continue;
    feeSeen.add(dupKey);
    fees.push({ label, amount });
  }

  return {
    supplierName: pi.supplierName?.trim() || null,
    piNumber: pi.piNumber?.trim() || null,
    piDate: pi.piDate && /^\d{4}-\d{2}-\d{2}$/.test(pi.piDate.trim()) ? pi.piDate.trim() : null,
    items,
    fees,
    totalAmount: toNumber(pi.totalAmount),
  };
}
