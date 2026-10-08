import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";

/**
 * Reads a Chinese supplier proforma invoice (PI) image into structured lines
 * through Vercel AI Gateway, with open-weight vision models only.
 * - PI_EXTRACT_MODEL: primary gateway "provider/model" id (needs vision + structured output)
 * - PI_EXTRACT_FALLBACK_MODELS: comma-separated ids the gateway tries in order
 *   when the primary fails or is unavailable ("" disables fallback)
 * Auth: AI_GATEWAY_API_KEY, or the Vercel OIDC token when deployed on Vercel.
 */
export const DEFAULT_PI_MODEL = "google/gemma-4-31b-it";
export const DEFAULT_PI_FALLBACK_MODELS = ["alibaba/qwen3.8-27b"];

function fallbackModels(): string[] {
  const raw = process.env.PI_EXTRACT_FALLBACK_MODELS;
  if (raw == null) return DEFAULT_PI_FALLBACK_MODELS;
  return raw.split(",").map((m) => m.trim()).filter(Boolean);
}

const piSchema = z.object({
  supplierName: z.string().nullable().describe("Seller / factory company name"),
  piNumber: z.string().nullable().describe("PI No. / invoice number"),
  piDate: z.string().nullable().describe("Invoice date as YYYY-MM-DD"),
  items: z
    .array(
      z.object({
        supplierCode: z.string().describe("Item No. / model code exactly as printed, e.g. YSP125-Q304"),
        description: z.string().nullable().describe("Short description: size, material"),
        boxes: z.number().describe("Number of boxes / cartons (CTNS, /box column)"),
        sqm: z.number().nullable().describe("Square metres (M2 / m² column)"),
        unitPrice: z.number().nullable().describe("Unit price in CNY (often per m²)"),
        amount: z.number().describe("Line amount in CNY (Amount column)"),
        weightKg: z.number().nullable().describe("Gross weight of the whole line in kg (G.W. / Weight KG)"),
      })
    )
    .describe("Product lines only"),
  fees: z
    .array(
      z.object({
        label: z.string().describe("e.g. Freight to agent warehouse, Pallet fee"),
        amount: z.number().describe("Fee amount in CNY (the amount column, not the unit price)"),
      })
    )
    .describe("Extra charges that are not products"),
  totalAmount: z.number().nullable().describe("Grand TOTAL in CNY printed on the invoice"),
});

export type ExtractedPi = z.infer<typeof piSchema>;

const INSTRUCTIONS = `You read Chinese ceramic-tile supplier proforma invoices (PI) and return the table as JSON.
Rules:
- One entry in "items" per product row. supplierCode = the Item No./model code exactly as printed.
- boxes = number of boxes/cartons (columns like "/box", "CTNS", "Quantity box"). Never use pieces or m² as boxes.
- amount = the line Amount in CNY (RMB). If a row only shows unit price and m², amount = unit price × m².
- weightKg = gross weight for the whole row in kg, null if the PI has no weight column.
- Rows like "Freight", "The pallet fee", "Shipping cost to agent's warehouse", "运费" are fees, not items. Use their amount column.
- Ignore TOTAL, deposit/received payment and Balance rows, bank information and the shipping address.
- totalAmount = the grand TOTAL in CNY printed on the PI (before deposits), null if absent.
- Numbers must be plain numbers without currency symbols or thousands separators.`;

export class PiExtractConfigError extends Error {}

/** `pages`: one image per PI page (a photo, or each page of a PDF rendered in the browser). */
export async function extractProformaInvoice(
  pages: { image: Uint8Array; mediaType: string }[]
): Promise<ExtractedPi> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new PiExtractConfigError(
      "ยังไม่ได้ตั้งค่า AI_GATEWAY_API_KEY สำหรับอ่านใบ PI อัตโนมัติ กรุณากรอกหรือวางข้อมูลเอง"
    );
  }

  const { output } = await generateText({
    model: process.env.PI_EXTRACT_MODEL || DEFAULT_PI_MODEL,
    output: Output.object({ schema: piSchema, name: "proforma_invoice" }),
    system: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              pages.length > 1
                ? `Extract this proforma invoice. It has ${pages.length} pages, in order; return one combined result.`
                : "Extract this proforma invoice.",
          },
          ...pages.map((p) => ({ type: "file" as const, data: p.image, mediaType: p.mediaType })),
        ],
      },
    ],
    temperature: 0,
    maxRetries: 1,
    providerOptions: { gateway: { models: fallbackModels() } },
  });

  return cleanExtractedPi(output);
}

function cleanExtractedPi(pi: ExtractedPi): ExtractedPi {
  const n = (v: number | null | undefined) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    supplierName: pi.supplierName?.trim() || null,
    piNumber: pi.piNumber?.trim() || null,
    piDate: pi.piDate && /^\d{4}-\d{2}-\d{2}$/.test(pi.piDate) ? pi.piDate : null,
    items: pi.items
      .filter((it) => it.supplierCode?.trim())
      .map((it) => {
        const sqm = n(it.sqm);
        const unitPrice = n(it.unitPrice);
        let amount = n(it.amount) ?? 0;
        if (amount <= 0 && unitPrice != null && sqm != null) amount = Math.round(unitPrice * sqm * 100) / 100;
        return {
          supplierCode: it.supplierCode.trim(),
          description: it.description?.trim() || null,
          boxes: Math.max(0, Math.round(n(it.boxes) ?? 0)),
          sqm,
          unitPrice,
          amount,
          weightKg: n(it.weightKg),
        };
      }),
    fees: pi.fees
      .filter((f) => n(f.amount) != null && Number(f.amount) !== 0)
      .map((f) => ({ label: f.label?.trim() || "ค่าใช้จ่าย", amount: Number(f.amount) })),
    totalAmount: n(pi.totalAmount),
  };
}
