"use server";

import { prisma } from "@/lib/prisma";
import { requireUserAction, assertAdmin } from "@/lib/auth";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Prisma, StockDocumentType } from "@/generated/prisma/client";
import {
  createStockDocumentSchema,
  stockDocumentLineSchema,
  stockScanSchema,
} from "@/lib/validators";
import { generateStockDocumentNumber } from "@/lib/stock-document-number";
import { resolveStockCode } from "@/lib/stock-code";

const STOCK_PATHS = [
  "/stock",
  "/stock/receive",
  "/stock/issue",
  "/stock/count",
  "/stock/summary",
  "/stock/history",
  "/quotations",
];

function revalidateStockPaths() {
  for (const path of STOCK_PATHS) revalidatePath(path);
}

async function syncProductStockFromVariants(tx: any, productId: string) {
  const result = await tx.productColorVariant.aggregate({
    where: { productId },
    _sum: { stockQuantity: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: result._sum.stockQuantity ?? 0 },
  });
}

/** Quick path from the scan-anything screen: create a document of `type` and add one scanned item to it. */
export async function startStockDocumentWithItem(
  type: "RECEIVE" | "ISSUE" | "COUNT",
  code: string
) {
  await requireUserAction();
  const resolution = await resolveStockCode(code);
  if (resolution.kind === "not-found") throw new Error(`ไม่พบสินค้าจากรหัส "${code}"`);
  if (resolution.kind === "ambiguous") throw new Error("รหัสนี้ตรงกับหลายรายการ กรุณาเลือกสินค้าด้วยตนเอง");
  if (resolution.kind === "product-needs-variant") {
    throw new Error(`"${resolution.productName}" มีหลายสี กรุณาเลือกสีจากหน้ารายการสินค้า`);
  }

  const document = await createStockDocument({ type, documentDate: new Date() });
  await addStockDocumentLine(document.id, {
    productId: resolution.productId,
    colorVariantId: resolution.kind === "variant" ? resolution.colorVariantId : undefined,
    quantity: 1,
  });
  return document;
}

export async function createStockDocument(data: unknown) {
  const validated = createStockDocumentSchema.parse(data);
  const user = await requireUserAction();

  const documentNumber = await generateStockDocumentNumber(validated.type as StockDocumentType);

  const document = await prisma.stockDocument.create({
    data: {
      type: validated.type as StockDocumentType,
      documentNumber,
      documentDate: validated.documentDate,
      note: validated.note || null,
      reference: validated.reference || null,
      lotNumber: validated.lotNumber || null,
      sourceDocumentId: validated.sourceDocumentId || null,
      createdById: user.id,
    },
  });

  revalidateStockPaths();
  return serialize(document);
}

/** Pre-fills an ISSUE draft from a quotation's outstanding line items. */
export async function createIssueFromDocument(documentId: string) {
  const user = await requireUserAction();
  const { getDocumentIssueProgress } = await import("@/data/stock-documents");
  const progress = await getDocumentIssueProgress(documentId);

  const outstanding = progress.filter((li: any) => li.remaining > 0 && li.productId);
  if (outstanding.length === 0) {
    throw new Error("ไม่มีรายการที่ต้องเบิกสำหรับเอกสารนี้");
  }

  const documentNumber = await generateStockDocumentNumber(StockDocumentType.ISSUE);

  const document = await prisma.stockDocument.create({
    data: {
      type: "ISSUE",
      documentNumber,
      documentDate: new Date(),
      sourceDocumentId: documentId,
      createdById: user.id,
      lines: {
        create: outstanding.map((li: any, index: number) => ({
          sequence: index + 1,
          productId: li.productId,
          colorVariantId: li.colorVariantId,
          productSku: li.productSku ?? "",
          productName: li.productName,
          colorVariantName: li.colorVariantName,
          stockCode: "", // filled in below once we know it
          quantity: 0, // scanning fills this in; starts unticked
          sourceLineItemId: li.id,
          orderedQuantity: li.remaining,
        })),
      },
    },
    include: { lines: true },
  });

  // Backfill stockCode snapshots (needs a DB round trip per product/variant;
  // cheap since outstanding lists are short).
  for (const line of document.lines) {
    const code = line.colorVariantId
      ? (await prisma.productColorVariant.findUnique({ where: { id: line.colorVariantId }, select: { stockCode: true } }))?.stockCode
      : (await prisma.product.findUnique({ where: { id: line.productId }, select: { stockCode: true } }))?.stockCode;
    if (code) {
      await prisma.stockDocumentLine.update({ where: { id: line.id }, data: { stockCode: code } });
    }
  }

  revalidateStockPaths();
  return serialize(document);
}

async function assertDraftOwnedByAnyUser(stockDocumentId: string) {
  const doc = await prisma.stockDocument.findUnique({
    where: { id: stockDocumentId },
    select: { status: true },
  });
  if (!doc) throw new Error("ไม่พบเอกสาร");
  if (doc.status !== "DRAFT") throw new Error("เอกสารนี้ถูกบันทึกแล้ว ไม่สามารถแก้ไขได้");
}

/** Upsert a line by (product, variant, sourceLineItem) — scanning the same item again increments quantity. */
export async function addStockDocumentLine(stockDocumentId: string, data: unknown) {
  await requireUserAction();
  const validated = stockDocumentLineSchema.parse(data);
  await assertDraftOwnedByAnyUser(stockDocumentId);

  const [product, variant] = await Promise.all([
    prisma.product.findUniqueOrThrow({
      where: { id: validated.productId },
      select: { sku: true, name: true, stockCode: true },
    }),
    validated.colorVariantId
      ? prisma.productColorVariant.findUniqueOrThrow({
          where: { id: validated.colorVariantId },
          select: { name: true, stockCode: true },
        })
      : Promise.resolve(null),
  ]);

  const existing = await prisma.stockDocumentLine.findFirst({
    where: {
      stockDocumentId,
      productId: validated.productId,
      colorVariantId: validated.colorVariantId || null,
      sourceLineItemId: validated.sourceLineItemId || null,
    },
  });

  const line = existing
    ? await prisma.stockDocumentLine.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + validated.quantity },
      })
    : await prisma.stockDocumentLine.create({
        data: {
          stockDocumentId,
          sequence: (await prisma.stockDocumentLine.count({ where: { stockDocumentId } })) + 1,
          productId: validated.productId,
          colorVariantId: validated.colorVariantId || null,
          productSku: product.sku,
          productName: product.name,
          colorVariantName: variant?.name ?? null,
          stockCode: variant?.stockCode ?? product.stockCode,
          quantity: validated.quantity,
          lotNumber: validated.lotNumber || null,
          note: validated.note || null,
          sourceLineItemId: validated.sourceLineItemId || null,
        },
      });

  revalidateStockPaths();
  return serialize(line);
}

/** Resolve a scanned/typed code and add it to the document in one call. */
export async function scanStockDocumentLine(stockDocumentId: string, data: unknown) {
  const validated = stockScanSchema.parse(data);
  const resolution = await resolveStockCode(validated.code);

  if (resolution.kind === "not-found") {
    throw new Error(`ไม่พบสินค้าจากรหัส "${validated.code}"`);
  }
  if (resolution.kind === "ambiguous") {
    throw new Error("รหัสนี้ตรงกับหลายรายการ กรุณาเลือกสินค้าด้วยตนเอง");
  }
  if (resolution.kind === "product-needs-variant") {
    return { needsVariant: true as const, resolution };
  }

  const line = await addStockDocumentLine(stockDocumentId, {
    productId: resolution.productId,
    colorVariantId: resolution.kind === "variant" ? resolution.colorVariantId : undefined,
    quantity: validated.quantity,
  });

  return { needsVariant: false as const, line };
}

export async function updateStockDocumentLine(lineId: string, data: unknown) {
  await requireUserAction();
  const line = await prisma.stockDocumentLine.findUniqueOrThrow({
    where: { id: lineId },
    select: { stockDocumentId: true },
  });
  await assertDraftOwnedByAnyUser(line.stockDocumentId);

  const schema = stockDocumentLineSchema.partial();
  const validated = schema.parse(data);

  const updated = await prisma.stockDocumentLine.update({
    where: { id: lineId },
    data: {
      quantity: validated.quantity,
      lotNumber: validated.lotNumber,
      note: validated.note,
    },
  });

  revalidateStockPaths();
  return serialize(updated);
}

export async function removeStockDocumentLine(lineId: string) {
  await requireUserAction();
  const line = await prisma.stockDocumentLine.findUniqueOrThrow({
    where: { id: lineId },
    select: { stockDocumentId: true },
  });
  await assertDraftOwnedByAnyUser(line.stockDocumentId);

  await prisma.stockDocumentLine.delete({ where: { id: lineId } });
  revalidateStockPaths();
}

export async function deleteStockDocumentDraft(stockDocumentId: string) {
  await requireUserAction();
  await assertDraftOwnedByAnyUser(stockDocumentId);
  await prisma.stockDocument.delete({ where: { id: stockDocumentId } });
  revalidateStockPaths();
}

/**
 * Posts a DRAFT stock document atomically: locks every affected product/
 * variant row in deterministic id order, applies the movement, writes one
 * StockMovement per line, and flips the header to POSTED. Re-posting an
 * already-POSTED document is rejected — this is the idempotency gate that
 * the old confirm-time deduction never had.
 */
export async function postStockDocument(stockDocumentId: string) {
  const user = await requireUserAction();

  const result = await prisma.$transaction(async (tx) => {
    const headerRows = await tx.$queryRaw<
      { id: string; status: string; type: string; documentNumber: string }[]
    >(Prisma.sql`
      SELECT id, status, type, document_number AS "documentNumber"
      FROM stock_documents WHERE id = ${stockDocumentId} FOR UPDATE
    `);
    const header = headerRows[0];
    if (!header) throw new Error("ไม่พบเอกสาร");
    if (header.status !== "DRAFT") throw new Error("เอกสารนี้ถูกบันทึกแล้ว");

    if (header.type === "COUNT") {
      await assertAdmin();
    }

    const lines = await tx.stockDocumentLine.findMany({
      where: { stockDocumentId },
      orderBy: { sequence: "asc" },
    });
    if (lines.length === 0) throw new Error("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
    if (header.type !== "COUNT") {
      for (const line of lines) {
        if (line.quantity <= 0) {
          throw new Error(`จำนวนต้องมากกว่า 0: ${line.productName}`);
        }
      }
    }

    const variantIds = [...new Set(lines.filter((l) => l.colorVariantId).map((l) => l.colorVariantId!))].sort();
    const productOnlyIds = [...new Set(lines.filter((l) => !l.colorVariantId).map((l) => l.productId))].sort();

    // A product whose colours are tracked as variants must never receive a
    // product-level movement (Product.stockQuantity is a rollup SUM).
    if (productOnlyIds.length > 0) {
      const withVariants = await tx.productColorVariant.findMany({
        where: { productId: { in: productOnlyIds } },
        select: { productId: true },
        distinct: ["productId"],
      });
      if (withVariants.length > 0) {
        throw new Error("มีสินค้าที่ต้องระบุสีก่อนทำรายการ กรุณาเลือกสี");
      }
    }

    const variantRows =
      variantIds.length > 0
        ? await tx.$queryRaw<{ id: string; stock_quantity: number }[]>(Prisma.sql`
            SELECT id, stock_quantity FROM product_color_variants
            WHERE id IN (${Prisma.join(variantIds)}) ORDER BY id FOR UPDATE
          `)
        : [];
    const productRows =
      productOnlyIds.length > 0
        ? await tx.$queryRaw<{ id: string; stock_quantity: number }[]>(Prisma.sql`
            SELECT id, stock_quantity FROM products
            WHERE id IN (${Prisma.join(productOnlyIds)}) ORDER BY id FOR UPDATE
          `)
        : [];

    const variantBalance = new Map(variantRows.map((r) => [r.id, r.stock_quantity]));
    const productBalance = new Map(productRows.map((r) => [r.id, r.stock_quantity]));

    const touchedProductIds = new Set<string>();

    for (const line of lines) {
      const isVariant = !!line.colorVariantId;
      const currentBalance = isVariant
        ? variantBalance.get(line.colorVariantId!)!
        : productBalance.get(line.productId)!;

      let newBalance: number;
      let movementType: "IN" | "OUT" | "ADJUSTMENT";
      let movementQty: number;
      let reason: string;

      if (header.type === "RECEIVE") {
        newBalance = currentBalance + line.quantity;
        movementType = "IN";
        movementQty = line.quantity;
        reason = line.note || `รับเข้าตามเอกสาร ${header.documentNumber}`;
      } else if (header.type === "ISSUE") {
        newBalance = currentBalance - line.quantity;
        if (newBalance < 0) {
          throw new Error(`สต็อคไม่เพียงพอ: ${line.productName} (คงเหลือ ${currentBalance})`);
        }
        movementType = "OUT";
        movementQty = line.quantity;
        reason = line.note || `เบิกออกตามเอกสาร ${header.documentNumber}`;
      } else {
        // COUNT: the counted quantity is absolute; delta against live on-hand.
        const delta = line.quantity - currentBalance;
        if (delta === 0) {
          await tx.stockDocumentLine.update({
            where: { id: line.id },
            data: { systemQuantity: currentBalance },
          });
          continue;
        }
        newBalance = line.quantity;
        movementType = "ADJUSTMENT";
        movementQty = Math.abs(delta);
        reason = `ตรวจนับ (${header.documentNumber}): ${currentBalance} → ${line.quantity}`;
      }

      if (isVariant) {
        await tx.productColorVariant.update({
          where: { id: line.colorVariantId! },
          data: { stockQuantity: newBalance },
        });
        touchedProductIds.add(line.productId);
      } else {
        await tx.product.update({
          where: { id: line.productId },
          data: { stockQuantity: newBalance },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          colorVariantId: line.colorVariantId,
          type: movementType,
          quantity: movementQty,
          reason,
          reference: header.documentNumber,
          lotNumber: line.lotNumber,
          balanceAfter: newBalance,
          stockDocumentId,
          stockDocumentLineId: line.id,
          createdById: user.id,
        },
      });

      if (header.type === "COUNT") {
        await tx.stockDocumentLine.update({
          where: { id: line.id },
          data: { systemQuantity: currentBalance },
        });
      }
    }

    for (const productId of touchedProductIds) {
      await syncProductStockFromVariants(tx, productId);
    }

    return tx.stockDocument.update({
      where: { id: stockDocumentId },
      data: { status: "POSTED", postedAt: new Date(), postedById: user.id },
    });
  }, { timeout: 30000 });

  revalidateStockPaths();
  return serialize(result);
}

/**
 * Cancels a stock document. A DRAFT is simply discarded. A POSTED document
 * requires admin and creates a reversal document with mirrored lines, whose
 * movements carry reversesMovementId — unique at the database level, so a
 * second cancel attempt cannot double-reverse (unlike the old
 * restoreStockForDocument, which matched by document-number string).
 */
export async function cancelStockDocument(stockDocumentId: string, reason?: string) {
  const document = await prisma.stockDocument.findUniqueOrThrow({
    where: { id: stockDocumentId },
    include: { lines: true, movements: true },
  });

  if (document.status === "CANCELLED") {
    throw new Error("เอกสารนี้ถูกยกเลิกแล้ว");
  }

  if (document.status === "DRAFT") {
    await requireUserAction();
    await prisma.stockDocument.update({
      where: { id: stockDocumentId },
      data: { status: "CANCELLED" },
    });
    revalidateStockPaths();
    return;
  }

  // POSTED -> reversal
  const user = await assertAdmin();
  if (document.reversalOfId) {
    throw new Error("เอกสารนี้เป็นเอกสารกลับรายการอยู่แล้ว ไม่สามารถยกเลิกซ้ำได้");
  }

  const existingReversal = await prisma.stockDocument.findFirst({
    where: { reversalOfId: stockDocumentId },
  });
  if (existingReversal) {
    throw new Error("เอกสารนี้ถูกกลับรายการไปแล้ว");
  }

  await prisma.$transaction(async (tx) => {
    const reversalNumber = await generateStockDocumentNumber(document.type);

    const reversal = await tx.stockDocument.create({
      data: {
        type: document.type,
        documentNumber: reversalNumber,
        status: "POSTED",
        documentDate: new Date(),
        note: `กลับรายการจาก ${document.documentNumber}${reason ? `: ${reason}` : ""}`,
        reversalOfId: stockDocumentId,
        createdById: user.id,
        postedAt: new Date(),
        postedById: user.id,
      },
    });

    const touchedProductIds = new Set<string>();

    for (const movement of document.movements) {
      // Reverse the balance in the opposite direction of the original movement.
      const isVariant = !!movement.colorVariantId;
      const sign = movement.type === "IN" ? -1 : movement.type === "OUT" ? 1 : 0;
      if (sign === 0) continue; // ADJUSTMENT reversal is ambiguous; skip (COUNT docs aren't reversible via this path)

      if (isVariant) {
        const variant = await tx.productColorVariant.findUniqueOrThrow({
          where: { id: movement.colorVariantId! },
          select: { stockQuantity: true },
        });
        const newBalance = variant.stockQuantity + sign * movement.quantity;
        await tx.productColorVariant.update({
          where: { id: movement.colorVariantId! },
          data: { stockQuantity: newBalance },
        });
        touchedProductIds.add(movement.productId);
        await tx.stockMovement.create({
          data: {
            productId: movement.productId,
            colorVariantId: movement.colorVariantId,
            type: sign > 0 ? "IN" : "OUT",
            quantity: movement.quantity,
            reason: `กลับรายการจาก ${document.documentNumber}`,
            reference: reversalNumber,
            balanceAfter: newBalance,
            stockDocumentId: reversal.id,
            createdById: user.id,
            reversesMovementId: movement.id,
          },
        });
      } else {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: movement.productId },
          select: { stockQuantity: true },
        });
        const newBalance = product.stockQuantity + sign * movement.quantity;
        await tx.product.update({
          where: { id: movement.productId },
          data: { stockQuantity: newBalance },
        });
        await tx.stockMovement.create({
          data: {
            productId: movement.productId,
            type: sign > 0 ? "IN" : "OUT",
            quantity: movement.quantity,
            reason: `กลับรายการจาก ${document.documentNumber}`,
            reference: reversalNumber,
            balanceAfter: newBalance,
            stockDocumentId: reversal.id,
            createdById: user.id,
            reversesMovementId: movement.id,
          },
        });
      }
    }

    for (const productId of touchedProductIds) {
      await syncProductStockFromVariants(tx, productId);
    }

    await tx.stockDocument.update({
      where: { id: stockDocumentId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: user.id },
    });
  }, { timeout: 30000 });

  revalidateStockPaths();
}
