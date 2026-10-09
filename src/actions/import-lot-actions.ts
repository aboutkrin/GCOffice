"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth";
import { serialize } from "@/lib/utils";
import { importLotSchema, type ImportLotFormData } from "@/lib/validators";
import { computeLandedCosts, normalizeCode, normalizeSupplier } from "@/lib/landed-cost";
import { matchSupplierCodes, searchLotItemsForCost } from "@/data/import-lots";
import { lockDocumentLineCosts } from "@/data/document-profit";
import { extractProformaInvoice, PiExtractConfigError } from "@/lib/pi-extract";
import { Prisma } from "@/generated/prisma/client";
import { blendLotCost, type CostBreakdownPart } from "@/lib/line-cost";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: { message: string }[] }).issues;
    if (issues?.[0]?.message) return issues[0].message;
  }
  return error instanceof Error ? error.message : fallback;
}

/** Builds the nested create payload with landed costs computed server-side. */
function buildInvoices(v: ImportLotFormData) {
  const landed = computeLandedCosts({
    exchangeRate: v.exchangeRate,
    ratePerKg: v.ratePerKg,
    freightOverride: v.freightOverride,
    otherCost: v.otherCost,
    invoices: v.invoices.map((inv) => ({
      fees: inv.fees,
      items: inv.items.map((it) => ({ boxes: it.boxes, amountCny: it.amountCny, weightKg: it.weightKg })),
    })),
  });

  const invoices: Prisma.SupplierInvoiceCreateWithoutLotInput[] = v.invoices.map((inv, i) => ({
    sequence: i + 1,
    supplierName: inv.supplierName,
    piNumber: inv.piNumber || null,
    piDate: inv.piDate ?? null,
    imageUrl: inv.imageUrl || null,
    statedTotalCny: inv.statedTotalCny ?? null,
    fees: inv.fees.filter((f) => f.amountCny !== 0) as unknown as Prisma.InputJsonValue,
    items: {
      create: inv.items.map((it, j) => ({
        sequence: j + 1,
        supplierCode: it.supplierCode,
        description: it.description || null,
        boxes: it.boxes,
        sqm: it.sqm ?? null,
        amountCny: it.amountCny,
        weightKg: it.weightKg ?? null,
        product: it.productId ? { connect: { id: it.productId } } : undefined,
        colorVariant: it.productId && it.colorVariantId ? { connect: { id: it.colorVariantId } } : undefined,
        landedTotal: landed.invoices[i].items[j].landedTotal,
        landedPerBox: landed.invoices[i].items[j].landedPerBox,
      })),
    },
  }));

  return { invoices, landed };
}

async function saveAliases(tx: Prisma.TransactionClient, v: ImportLotFormData) {
  for (const inv of v.invoices) {
    const supplierKey = normalizeSupplier(inv.supplierName);
    for (const it of inv.items) {
      const codeKey = normalizeCode(it.supplierCode);
      if (!it.rememberAlias || !it.productId || !codeKey) continue;
      await tx.supplierCodeAlias.upsert({
        where: { supplierKey_codeKey: { supplierKey, codeKey } },
        create: {
          supplierKey,
          codeKey,
          supplierCode: it.supplierCode,
          productId: it.productId,
          colorVariantId: it.colorVariantId || null,
        },
        update: {
          supplierCode: it.supplierCode,
          productId: it.productId,
          colorVariantId: it.colorVariantId || null,
        },
      });
    }
  }
}

function lotFields(v: ImportLotFormData, landed: ReturnType<typeof computeLandedCosts>) {
  return {
    name: v.name,
    lotNumber: v.lotNumber || null,
    orderDate: v.orderDate,
    chinaShipmentId: v.chinaShipmentId || null,
    transportMode: v.transportMode,
    ratePerKg: v.ratePerKg,
    freightOverride: v.freightOverride && v.freightOverride > 0 ? v.freightOverride : null,
    otherCost: v.otherCost ?? 0,
    exchangeRate: v.exchangeRate,
    totalWeightKg: landed.totalWeightKg,
    totalLanded: landed.totalLanded,
    notes: v.notes || null,
  };
}

function revalidateLots(id?: string) {
  revalidatePath("/import-lots");
  if (id) revalidatePath(`/import-lots/${id}`);
  revalidatePath("/product-costs");
}

export async function createImportLot(data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await assertAdmin();
    const v = importLotSchema.parse(data);
    const { invoices, landed } = buildInvoices(v);

    const lot = await prisma.$transaction(async (tx) => {
      const created = await tx.importLot.create({
        data: { ...lotFields(v, landed), createdById: user.id, invoices: { create: invoices } },
      });
      await saveAliases(tx, v);
      return created;
    });

    revalidateLots(lot.id);
    return { success: true, data: { id: lot.id } };
  } catch (error) {
    return { success: false, error: errorMessage(error, "ไม่สามารถบันทึกล็อตนำเข้าได้") };
  }
}

export async function updateImportLot(id: string, data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin();
    const v = importLotSchema.parse(data);
    const { invoices, landed } = buildInvoices(v);

    await prisma.$transaction(async (tx) => {
      await tx.supplierInvoice.deleteMany({ where: { lotId: id } });
      await tx.importLot.update({
        where: { id },
        data: { ...lotFields(v, landed), invoices: { create: invoices } },
      });
      await saveAliases(tx, v);
    });

    revalidateLots(id);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: errorMessage(error, "ไม่สามารถบันทึกล็อตนำเข้าได้") };
  }
}

export async function deleteImportLot(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    await prisma.importLot.delete({ where: { id } });
    revalidateLots();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "ไม่สามารถลบล็อตนำเข้าได้") };
  }
}

export async function matchSupplierCodesAction(supplierName: string, codes: string[]) {
  await assertAdmin();
  return matchSupplierCodes(supplierName, codes.slice(0, 500));
}

/**
 * Reads an uploaded PI with AI and returns the lines plus the product matches
 * for their codes. `imageUrls` are the page images already in our Supabase
 * storage: one photo, or every page of a PDF rendered in the browser.
 */
export async function extractProformaInvoiceAction(imageUrls: string[]) {
  try {
    await assertAdmin();

    const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
    const urls = imageUrls.slice(0, 8);
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      urls.length === 0 ||
      urls.some((u) => typeof u !== "string" || !u.startsWith(storagePrefix))
    ) {
      return { success: false as const, error: "ไฟล์ใบ PI ไม่ถูกต้อง" };
    }

    const pages = await Promise.all(
      urls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const mediaType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
        if (!mediaType.startsWith("image/")) throw new Error(`not an image: ${mediaType}`);
        return { image: new Uint8Array(await res.arrayBuffer()), mediaType };
      })
    ).catch((error) => {
      console.error("PI image fetch failed:", error);
      return null;
    });
    if (!pages) return { success: false as const, error: "ไม่สามารถเปิดไฟล์ใบ PI ได้" };

    const pi = await extractProformaInvoice(pages);
    if (pi.items.length === 0) {
      return { success: false as const, error: "อ่านรายการสินค้าจากไฟล์ไม่ได้ ลองใช้ไฟล์ที่ชัดขึ้น หรือกรอกเอง" };
    }
    const matches = await matchSupplierCodes(
      pi.supplierName ?? "",
      pi.items.map((it) => it.supplierCode)
    );
    return { success: true as const, data: serialize({ pi, matches }) };
  } catch (error) {
    console.error("PI extraction failed:", error);
    if (error instanceof PiExtractConfigError) {
      return { success: false as const, error: error.message };
    }
    return {
      success: false as const,
      error: "AI อ่านใบ PI ไม่สำเร็จ ลองอีกครั้ง หรือกรอก/วางข้อมูลเอง",
    };
  }
}

/** Profit card: actual delivery cost (office → site) and per-line manual costs. */
export async function updateDocumentCosts(
  documentId: string,
  data: {
    actualDeliveryCost: number | null;
    /** costBreakdown = the lots the boxes came from; unitCost is then recomputed from it */
    lines: { id: string; unitCost: number | null; costBreakdown?: CostBreakdownPart[] | null }[];
  }
): Promise<ActionResult> {
  try {
    await assertAdmin();
    const delivery = data.actualDeliveryCost;
    if (delivery != null && (!Number.isFinite(delivery) || delivery < 0)) {
      return { success: false, error: "ค่าขนส่งต้องไม่ติดลบ" };
    }
    const lines: { id: string; unitCost: number | null; costBreakdown: CostBreakdownPart[] | null }[] = [];
    for (const l of data.lines) {
      const parts = l.costBreakdown?.length ? l.costBreakdown : null;
      if (parts) {
        if (parts.length > 20) return { success: false, error: "เลือกล็อตได้ไม่เกิน 20 รายการต่อสินค้า" };
        if (parts.some((p) => !Number.isInteger(p.boxes))) {
          return { success: false, error: "จำนวนกล่องต้องเป็นจำนวนเต็ม" };
        }
        const cost = blendLotCost(parts);
        if (cost == null) return { success: false, error: "จำนวนกล่องต้องมากกว่า 0 และต้นทุนต้องไม่ติดลบ" };
        lines.push({
          id: l.id,
          unitCost: cost,
          costBreakdown: parts.map((p) => ({
            lotItemId: String(p.lotItemId).slice(0, 64),
            lotLabel: String(p.lotLabel).slice(0, 200),
            supplierCode: String(p.supplierCode).slice(0, 100),
            boxes: p.boxes,
            landedPerBox: p.landedPerBox,
          })),
        });
        continue;
      }
      if (l.unitCost != null && (!Number.isFinite(l.unitCost) || l.unitCost < 0)) {
        return { success: false, error: "ต้นทุนต้องไม่ติดลบ" };
      }
      lines.push({ id: l.id, unitCost: l.unitCost, costBreakdown: null });
    }

    await prisma.$transaction([
      prisma.document.update({
        where: { id: documentId },
        data: { actualDeliveryCost: delivery && delivery > 0 ? delivery : null },
      }),
      ...lines.map((l) =>
        prisma.documentLineItem.updateMany({
          where: { id: l.id, documentId },
          data: {
            unitCost: l.unitCost,
            costBreakdown: l.costBreakdown ? (l.costBreakdown as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          },
        })
      ),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/profit-report");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "ไม่สามารถบันทึกต้นทุนได้") };
  }
}

/** Profit card: re-lock every line's cost at today's average from import lots. */
export async function relockDocumentCosts(documentId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    await lockDocumentLineCosts(documentId, { overwrite: true });
    revalidatePath("/dashboard");
    revalidatePath("/profit-report");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "ไม่สามารถคำนวณต้นทุนใหม่ได้") };
  }
}

/** Profit card: lot lines to pick a document line's cost from. */
export async function searchLotItemsForCostAction(params: {
  productId: string | null;
  colorVariantId: string | null;
  query?: string;
}) {
  await assertAdmin();
  return searchLotItemsForCost({ ...params, query: params.query?.slice(0, 100) });
}

/**
 * Profit card: link a lot line that was never matched to the product/colour
 * of the bill line, and remember the code for that supplier — so the line
 * counts in this product's average cost from now on.
 */
export async function linkLotItemToProduct(
  itemId: string,
  productId: string,
  colorVariantId: string | null
): Promise<ActionResult> {
  try {
    await assertAdmin();
    const item = await prisma.supplierInvoiceItem.findUnique({
      where: { id: itemId },
      select: { productId: true, supplierCode: true, invoice: { select: { supplierName: true, lotId: true } } },
    });
    if (!item) return { success: false, error: "ไม่พบรายการในล็อตนำเข้า" };
    if (item.productId) return { success: false, error: "รายการนี้จับคู่กับสินค้าแล้ว" };
    if (colorVariantId) {
      const variant = await prisma.productColorVariant.findFirst({
        where: { id: colorVariantId, productId },
        select: { id: true },
      });
      if (!variant) colorVariantId = null;
    }

    const supplierKey = normalizeSupplier(item.invoice.supplierName);
    const codeKey = normalizeCode(item.supplierCode);
    await prisma.$transaction(async (tx) => {
      await tx.supplierInvoiceItem.update({
        where: { id: itemId },
        data: { productId, colorVariantId },
      });
      if (codeKey) {
        await tx.supplierCodeAlias.upsert({
          where: { supplierKey_codeKey: { supplierKey, codeKey } },
          create: { supplierKey, codeKey, supplierCode: item.supplierCode, productId, colorVariantId },
          update: { supplierCode: item.supplierCode, productId, colorVariantId },
        });
      }
    });

    revalidateLots(item.invoice.lotId);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, "ไม่สามารถจับคู่สินค้าได้") };
  }
}
