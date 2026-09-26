"use server";

import { prisma } from "@/lib/prisma";
import { documentSchema } from "@/lib/validators";
import { generateDocumentNumber, generateCustomInvoiceNumber } from "@/lib/document-number";
import { requireUserAction, assertAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DocumentStatus, PaymentTermType } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { toUTCNoon } from "@/lib/thai-date";
import { ZodError } from "zod";
import { checkAvailabilityForDocument, type StockShortage } from "@/data/stock-availability";

import { applyReceiptPayment, lockInvoice, paidReceipts, syncInvoicePaymentStatus } from "@/lib/receipt-payment-server";
import { satang } from "@/lib/receipt-payment";

function formatZodError(error: ZodError): string {
  return error.issues
    .map((i) => {
      const field = i.path.join(".");
      return field ? `${field}: ${i.message}` : i.message;
    })
    .join(", ");
}

type DepositDeductionInput = {
  sequence: number;
  depositDocumentId?: string | null;
  label: string;
  taxInvoiceNumber?: string;
  amount: number;
  depositDate?: Date | null;
};

/**
 * Resolve the amount to deduct for each deposit deduction row. Rows linked to
 * a deposit invoice always use that document's stored grandTotal — never the
 * client-supplied amount — so a stale/tampered client payload can't skew the
 * net payable. Manual (unlinked) rows keep the typed amount as-is.
 */
async function resolveDepositDeductions(
  tx: any,
  deductions: DepositDeductionInput[]
): Promise<{ rows: (DepositDeductionInput & { amount: number })[]; total: number }> {
  const linkedIds = deductions
    .map((d) => d.depositDocumentId)
    .filter((id): id is string => !!id);
  const linked = linkedIds.length
    ? await tx.document.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true, grandTotal: true },
      })
    : [];
  const grandTotalById = new Map(linked.map((d: any) => [d.id, Number(d.grandTotal)]));

  const rows = deductions.map((d) => ({
    ...d,
    amount: d.depositDocumentId && grandTotalById.has(d.depositDocumentId)
      ? (grandTotalById.get(d.depositDocumentId) as number)
      : d.amount,
  }));
  const total = rows.reduce((sum, d) => sum + d.amount, 0);
  return { rows, total };
}

export async function createDocument(data: unknown, options?: { asDraft?: boolean }) {
  try {
    const validated = documentSchema.parse(data);

    const user = await requireUserAction();
    if (validated.isDepositInvoice || validated.depositDeductions?.length) {
      throw new Error("กรุณารับชำระเงินมัดจำผ่านใบเสร็จรับเงิน");
    }
    if (validated.type === "RECEIPT" && (!validated.receiptPaymentType || !validated.receiptAmount)) {
      throw new Error("กรุณาเลือกประเภทและยอดรับชำระ");
    }

    const asDraft = options?.asDraft ?? false;
    // A deposit invoice's document number IS the manually-typed tax-invoice
    // number — it never gets an auto INV-YYMM-NNNN.
    const documentNumber = validated.isDepositInvoice
      ? validated.taxInvoiceNumber!.trim()
      : asDraft
        ? null
        : await generateDocumentNumber(validated.type);

    // For RECEIPT type, generate custom invoice number if not provided
    let customInvoiceNumber: string | undefined;
    if (validated.type === "RECEIPT") {
      customInvoiceNumber = validated.customInvoiceNumber?.trim() || undefined;
    }

    const company = await prisma.company.findUniqueOrThrow({
      where: { id: validated.companyId },
    });
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: validated.customerId },
    });

    const subtotal = validated.lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * Number(item.unitPrice),
      0
    );

    // Include shipping in subtotal before discount (same as frontend use-pricing.ts)
    const shippingCost = validated.pickupAtShowroom ? 0 : (validated.shippingCost || 0);
    const subtotalWithShipping = subtotal + shippingCost;

    let discountAmount = 0;
    if (validated.discountType === "PERCENTAGE" && validated.discountValue) {
      discountAmount = subtotalWithShipping * (validated.discountValue / 100);
    } else if (validated.discountType === "AMOUNT" && validated.discountValue) {
      discountAmount = validated.discountValue;
    }

    const afterDiscount = subtotalWithShipping - discountAmount;
    const vatAmount = validated.vatEnabled
      ? afterDiscount * (validated.vatRate / 100)
      : 0;
    const grandTotal = afterDiscount + vatAmount;

    // Determine initial status based on document type
    const statusMap: Record<string, DocumentStatus> = {
      QUOTATION: DocumentStatus.QUOTED,
      INVOICE: DocumentStatus.BILLED,
      RECEIPT: DocumentStatus.PAID,
    };
    const status = asDraft ? DocumentStatus.DRAFT : statusMap[validated.type];

    // Normalize documentDate to UTC noon (client may have already done this, but ensure consistency)
    const documentDate = toUTCNoon(new Date(validated.documentDate));

    const document = await prisma.$transaction(async (tx: any) => {
      if (validated.type === "RECEIPT") await lockInvoice(tx, validated.sourceInvoiceId!);
      const { rows: deductionRows, total: depositDeduction } = await resolveDepositDeductions(
        tx,
        validated.depositDeductions ?? []
      );
      if (depositDeduction > grandTotal + 0.01) {
        throw new Error("ยอดหักเงินมัดจำมากกว่ายอดรวมทั้งสิ้น");
      }
      const netPayable = grandTotal - depositDeduction;

      // Create document first (without nested line items / payment terms)
      const doc = await tx.document.create({
        data: {
          type: validated.type,
          status,
          documentNumber,
          customInvoiceNumber: customInvoiceNumber || undefined,
          isDepositInvoice: validated.isDepositInvoice,
          depositPercent: validated.isDepositInvoice ? validated.depositPercent ?? undefined : undefined,
          depositDeduction,
          netPayable,
          documentDate,
          companyId: validated.companyId,
          companySnapshot: serialize(company),
          customerId: validated.customerId,
          customerSnapshot: serialize(customer),
          subtotal,
          discountType: validated.discountType ?? undefined,
          discountValue: validated.discountValue,
          discountAmount,
          vatEnabled: validated.vatEnabled,
          vatRate: validated.vatRate,
          vatAmount,
          shippingCost,
          shippingLocation: !validated.pickupAtShowroom && !validated.freeShipping && shippingCost > 0
            ? validated.shippingLocation?.trim() || null
            : null,
          freeShipping: !validated.pickupAtShowroom && validated.freeShipping,
          freeShippingLocation: !validated.pickupAtShowroom && validated.freeShipping
            ? validated.freeShippingLocation?.trim() || null
            : null,
          pickupAtShowroom: validated.pickupAtShowroom,
          grandTotal,
          footerNotes: validated.footerNotes,
          productionDays: validated.productionDays,
          productionDaysMin: validated.productionDaysMin ?? undefined,
          productionDaysMax: validated.productionDaysMax ?? undefined,
          skipWeekends: validated.skipWeekends,
          skipHolidays: validated.skipHolidays,
          deliveryDateStart: validated.deliveryDateStart
            ? toUTCNoon(new Date(validated.deliveryDateStart))
            : undefined,
          deliveryDateEnd: validated.deliveryDateEnd
            ? toUTCNoon(new Date(validated.deliveryDateEnd))
            : undefined,
          deliveryCompletedDate: validated.deliveryCompletedDate
            ? toUTCNoon(new Date(validated.deliveryCompletedDate))
            : undefined,
          paymentDate: validated.paymentDate
            ? toUTCNoon(new Date(validated.paymentDate))
            : undefined,
          sourceQuotationId:
            validated.type === "INVOICE" ? validated.sourceQuotationId : undefined,
          sourceInvoiceId:
            validated.type === "RECEIPT" ? validated.sourceInvoiceId : undefined,
          createdById: user.id,
        },
      });

      // Bulk-insert line items with createMany (avoids oversized nested query)
      await tx.documentLineItem.createMany({
        data: validated.lineItems.map(
          (item: { sequence: number; productSku?: string; productName: string; productImage?: string; colorVariantName?: string; colorVariantSku?: string; productId?: string | null; colorVariantId?: string | null; showImage: boolean; details?: string; quantity: number; unitPrice: number }) => ({
            documentId: doc.id,
            sequence: item.sequence,
            productSku: item.productSku,
            productName: item.productName,
            productImage: item.productImage,
            colorVariantName: item.colorVariantName,
            colorVariantSku: item.colorVariantSku,
            productId: item.productId || null,
            colorVariantId: item.colorVariantId || null,
            showImage: item.showImage,
            details: item.details,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * Number(item.unitPrice),
          })
        ),
      });

      // Bulk-insert payment terms
      if (validated.paymentTerms && validated.paymentTerms.length > 0) {
        await tx.documentPaymentTerm.createMany({
          data: validated.paymentTerms.map(
            (term: { sequence: number; name: string; type: PaymentTermType; value: number; calculatedAmount: number; note?: string }) => ({
              documentId: doc.id,
              sequence: term.sequence,
              name: term.name,
              type: term.type,
              value: term.value,
              calculatedAmount: term.calculatedAmount,
              note: term.note,
            })
          ),
        });
      }

      // Bulk-insert deposit deductions
      if (deductionRows.length > 0) {
        await tx.documentDepositDeduction.createMany({
          data: deductionRows.map((d) => ({
            documentId: doc.id,
            sequence: d.sequence,
            depositDocumentId: d.depositDocumentId || null,
            label: d.label,
            taxInvoiceNumber: d.taxInvoiceNumber || null,
            amount: d.amount,
            depositDate: d.depositDate ? toUTCNoon(new Date(d.depositDate)) : null,
          })),
        });
      }

      if (validated.type === "RECEIPT") {
        await applyReceiptPayment(tx, doc.id, { sourceInvoiceId: validated.sourceInvoiceId!,
          type: validated.receiptPaymentType!, amount: validated.receiptAmount! });
        if (!asDraft) await syncInvoicePaymentStatus(tx, validated.sourceInvoiceId!);
      }

      // Return full document with relations
      return tx.document.findUniqueOrThrow({
        where: { id: doc.id },
        include: { lineItems: true, paymentTerms: true, depositDeductions: true },
      });
    });

    revalidatePath("/quotations");
    revalidatePath("/invoices");
    revalidatePath("/receipts");
    revalidatePath("/dashboard");
    return { success: true as const, data: serialize(document) };
  } catch (error) {
    console.error("createDocument error:", error);
    if (error instanceof ZodError) {
      return { success: false as const, error: `ข้อมูลไม่ถูกต้อง: ${formatZodError(error)}` };
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false as const, error: "เลขที่ใบกำกับภาษีนี้ถูกใช้แล้ว" };
    }
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างเอกสาร";
    return { success: false as const, error: message };
  }
}

export async function updateDocument(id: string, data: unknown) {
  try {
    const validated = documentSchema.parse(data);

    await requireUserAction();

    // Calculate totals
    const subtotal = validated.lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * Number(item.unitPrice),
      0
    );

    const shippingCost = validated.pickupAtShowroom ? 0 : (validated.shippingCost || 0);
    const subtotalWithShipping = subtotal + shippingCost;

    let discountAmount = 0;
    if (validated.discountType === "PERCENTAGE" && validated.discountValue) {
      discountAmount = subtotalWithShipping * (validated.discountValue / 100);
    } else if (validated.discountType === "AMOUNT" && validated.discountValue) {
      discountAmount = validated.discountValue;
    }

    const afterDiscount = subtotalWithShipping - discountAmount;
    const vatAmount = validated.vatEnabled
      ? afterDiscount * (validated.vatRate / 100)
      : 0;
    const grandTotal = afterDiscount + vatAmount;

    // Normalize documentDate to UTC noon
    const documentDate = toUTCNoon(new Date(validated.documentDate));

    // Get fresh snapshots
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: validated.companyId },
    });
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: validated.customerId },
    });

    const document = await prisma.$transaction(async (tx: any) => {
      const before = await tx.document.findUniqueOrThrow({ where: { id } });
      await lockInvoice(tx, before.sourceInvoiceId || id);
      const current = await tx.document.findUniqueOrThrow({ where: { id } });
      if (current.type !== validated.type || (current.sourceInvoiceId && current.sourceInvoiceId !== validated.sourceInvoiceId)) {
        throw new Error("ไม่สามารถเปลี่ยนประเภทหรือใบแจ้งหนี้อ้างอิงของเอกสาร");
      }
      if (!current.isDepositInvoice && validated.isDepositInvoice) throw new Error("ไม่สามารถสร้างใบแจ้งหนี้มัดจำใหม่");
      if (current.receiptPaymentType) {
        if (!validated.receiptPaymentType || !validated.receiptAmount) throw new Error("กรุณาระบุยอดรับชำระ");
        const changed = current.receiptPaymentType !== validated.receiptPaymentType || satang(current.netPayable) !== satang(validated.receiptAmount);
        if (current.status === "CANCELLED") throw new Error("กรุณาคืนสถานะใบเสร็จก่อนแก้ไข");
        if (changed || current.status === "DRAFT") {
          await applyReceiptPayment(tx, id, { sourceInvoiceId: current.sourceInvoiceId,
            type: validated.receiptPaymentType, amount: validated.receiptAmount });
        }
        await tx.document.update({ where: { id }, data: {
          documentDate, footerNotes: validated.footerNotes,
          customInvoiceNumber: validated.customInvoiceNumber?.trim() || null,
          paymentDate: validated.paymentDate ? toUTCNoon(new Date(validated.paymentDate)) : null,
        } });
        if (current.status === "PAID") await syncInvoicePaymentStatus(tx, current.sourceInvoiceId);
        return tx.document.findUniqueOrThrow({ where: { id }, include: { lineItems: true, paymentTerms: true, depositDeductions: true } });
      }
      if (validated.receiptPaymentType) throw new Error("ใบเสร็จเดิมต้องคงรูปแบบเดิม");
      if (current.type === "INVOICE") {
        const receipts = await paidReceipts(tx, id);
        const { total: deduction } = await resolveDepositDeductions(tx, validated.depositDeductions ?? []);
        if (receipts.length && (satang(current.netPayable) !== satang(grandTotal - deduction)
          || satang(current.vatAmount) !== satang(vatAmount) || current.companyId !== validated.companyId
          || current.customerId !== validated.customerId)) {
          throw new Error("กรุณายกเลิกใบเสร็จที่รับชำระแล้วก่อนเปลี่ยนยอด บริษัท หรือลูกค้าในใบแจ้งหนี้");
        }
        if (!Number(current.depositDeduction) && validated.depositDeductions?.length) {
          throw new Error("กรุณาหักเงินมัดจำผ่านใบเสร็จยอดคงเหลือ");
        }
      }
      const { rows: deductionRows, total: depositDeduction } = await resolveDepositDeductions(
        tx,
        validated.depositDeductions ?? []
      );
      if (depositDeduction > grandTotal + 0.01) {
        throw new Error("ยอดหักเงินมัดจำมากกว่ายอดรวมทั้งสิ้น");
      }
      const netPayable = grandTotal - depositDeduction;

      // Delete old items
      await tx.documentLineItem.deleteMany({ where: { documentId: id } });
      await tx.documentPaymentTerm.deleteMany({ where: { documentId: id } });
      await tx.documentDepositDeduction.deleteMany({ where: { documentId: id } });

      // Update document fields (without nested creates)
      await tx.document.update({
        where: { id },
        data: {
          documentDate,
          customInvoiceNumber: validated.type === "RECEIPT"
            ? (validated.customInvoiceNumber?.trim() || undefined)
            : undefined,
          depositDeduction,
          netPayable,
          companyId: validated.companyId,
          companySnapshot: serialize(company),
          customerId: validated.customerId,
          customerSnapshot: serialize(customer),
          subtotal,
          discountType: validated.discountType ?? null,
          discountValue: validated.discountValue ?? null,
          discountAmount,
          vatEnabled: validated.vatEnabled,
          vatRate: validated.vatRate,
          vatAmount,
          shippingCost,
          shippingLocation: !validated.pickupAtShowroom && !validated.freeShipping && shippingCost > 0
            ? validated.shippingLocation?.trim() || null
            : null,
          freeShipping: !validated.pickupAtShowroom && validated.freeShipping,
          freeShippingLocation: !validated.pickupAtShowroom && validated.freeShipping
            ? validated.freeShippingLocation?.trim() || null
            : null,
          pickupAtShowroom: validated.pickupAtShowroom,
          grandTotal,
          footerNotes: validated.footerNotes,
          productionDays: validated.productionDays,
          productionDaysMin: validated.productionDaysMin ?? null,
          productionDaysMax: validated.productionDaysMax ?? null,
          skipWeekends: validated.skipWeekends,
          skipHolidays: validated.skipHolidays,
          deliveryDateStart: validated.deliveryDateStart
            ? toUTCNoon(new Date(validated.deliveryDateStart))
            : null,
          deliveryDateEnd: validated.deliveryDateEnd
            ? toUTCNoon(new Date(validated.deliveryDateEnd))
            : null,
          deliveryCompletedDate: validated.deliveryCompletedDate
            ? toUTCNoon(new Date(validated.deliveryCompletedDate))
            : null,
          paymentDate: validated.paymentDate
            ? toUTCNoon(new Date(validated.paymentDate))
            : null,
        },
      });

      // Bulk-insert line items with createMany (avoids oversized nested query)
      await tx.documentLineItem.createMany({
        data: validated.lineItems.map(
          (item: { sequence: number; productSku?: string; productName: string; productImage?: string; colorVariantName?: string; colorVariantSku?: string; productId?: string | null; colorVariantId?: string | null; showImage: boolean; details?: string; quantity: number; unitPrice: number }) => ({
            documentId: id,
            sequence: item.sequence,
            productSku: item.productSku,
            productName: item.productName,
            productImage: item.productImage,
            colorVariantName: item.colorVariantName,
            colorVariantSku: item.colorVariantSku,
            productId: item.productId || null,
            colorVariantId: item.colorVariantId || null,
            showImage: item.showImage,
            details: item.details,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * Number(item.unitPrice),
          })
        ),
      });

      // Bulk-insert payment terms
      if (validated.paymentTerms && validated.paymentTerms.length > 0) {
        await tx.documentPaymentTerm.createMany({
          data: validated.paymentTerms.map(
            (term: { sequence: number; name: string; type: PaymentTermType; value: number; calculatedAmount: number; note?: string }) => ({
              documentId: id,
              sequence: term.sequence,
              name: term.name,
              type: term.type,
              value: term.value,
              calculatedAmount: term.calculatedAmount,
              note: term.note,
            })
          ),
        });
      }

      // Bulk-insert deposit deductions
      if (deductionRows.length > 0) {
        await tx.documentDepositDeduction.createMany({
          data: deductionRows.map((d) => ({
            documentId: id,
            sequence: d.sequence,
            depositDocumentId: d.depositDocumentId || null,
            label: d.label,
            taxInvoiceNumber: d.taxInvoiceNumber || null,
            amount: d.amount,
            depositDate: d.depositDate ? toUTCNoon(new Date(d.depositDate)) : null,
          })),
        });
      }

      if (current.type === "RECEIPT" && current.sourceInvoiceId && current.status === "PAID") {
        await syncInvoicePaymentStatus(tx, current.sourceInvoiceId);
      }

      // Return full document with relations
      return tx.document.findUniqueOrThrow({
        where: { id },
        include: { lineItems: true, paymentTerms: true, depositDeductions: true },
      });
    });

    revalidatePath("/quotations");
    revalidatePath("/invoices");
    revalidatePath("/receipts");
    revalidatePath("/dashboard");
    return { success: true as const, data: serialize(document) };
  } catch (error) {
    console.error("updateDocument error:", error);
    if (error instanceof ZodError) {
      return { success: false as const, error: `ข้อมูลไม่ถูกต้อง: ${formatZodError(error)}` };
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false as const, error: "เลขที่ใบกำกับภาษีนี้ถูกใช้แล้ว" };
    }
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกเอกสาร";
    return { success: false as const, error: message };
  }
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus
) {
  const user = await requireUserAction();

  const { document, enteringConfirmed } = await prisma.$transaction(async (tx) => {
    // Fetch current status to determine reservation actions
    const before = await tx.document.findUniqueOrThrow({ where: { id } });
    await lockInvoice(tx, before.sourceInvoiceId || id);
    const currentDocument = await tx.document.findUniqueOrThrow({ where: { id } });
    const allowed: Record<string, string[]> = {
      QUOTATION: ["DRAFT", "QUOTED", "CONFIRMED", "SHIPPED", "CANCELLED"],
      INVOICE: ["DRAFT", "BILLED", "DEPOSITED", "PAID", "CANCELLED"],
      RECEIPT: ["DRAFT", "PAID", "CANCELLED"],
    };
    if (!allowed[currentDocument.type].includes(status)) throw new Error("สถานะไม่ถูกต้องสำหรับเอกสารนี้");
    if (currentDocument.type === "INVOICE" && (await paidReceipts(tx, id)).length) {
      await syncInvoicePaymentStatus(tx, id);
      const derived = await tx.document.findUniqueOrThrow({ where: { id } });
      if (derived.status !== status) throw new Error("สถานะคำนวณจากใบเสร็จ กรุณายกเลิกใบเสร็จที่รับชำระแล้วก่อน");
    }
    if (currentDocument.type === "RECEIPT" && status === "PAID" && currentDocument.status !== "PAID" && currentDocument.receiptPaymentType) {
      await applyReceiptPayment(tx, id, { sourceInvoiceId: currentDocument.sourceInvoiceId!,
        type: currentDocument.receiptPaymentType, amount: Number(currentDocument.netPayable) }, currentDocument.status !== "DRAFT");
    }

    const oldStatus = currentDocument.status;
    const newStatus = status;

    // Cancelling a document that has already moved past DRAFT is an admin-only action.
    if (newStatus === DocumentStatus.CANCELLED && oldStatus !== DocumentStatus.DRAFT) {
      if (user.role !== "ADMIN") throw new Error("คุณไม่มีสิทธิ์ใช้งานส่วนนี้");
    }

    // Confirming opts the document into the reservation system (see
    // src/data/stock-availability.ts). Once true this never reverts — a
    // cancelled document simply drops out of the reserving statuses
    // (CONFIRMED/SHIPPED), so its reservation disappears from the derived query
    // without any stock movement being written. Nothing here touches on-hand:
    // that only changes via goods receive / issue / stock count.
    const enteringConfirmed = newStatus === DocumentStatus.CONFIRMED && oldStatus !== DocumentStatus.CONFIRMED;

    // Finalizing a draft: the running document number is only burned the moment
    // it leaves DRAFT for a real status (cancelling a draft outright still
    // doesn't consume one). A deposit invoice never gets an auto number — its
    // number is the manually-typed tax-invoice number entered at save time —
    // so leaving DRAFT without one is a hard stop instead.
    const leavingDraft =
      oldStatus === DocumentStatus.DRAFT &&
      newStatus !== DocumentStatus.DRAFT &&
      newStatus !== DocumentStatus.CANCELLED &&
      !currentDocument.documentNumber;

    if (leavingDraft && currentDocument.isDepositInvoice) {
      throw new Error("กรุณาระบุเลขที่ใบกำกับภาษีก่อน");
    }

    const needsDocumentNumber = leavingDraft && !currentDocument.isDepositInvoice;
    const documentNumber = needsDocumentNumber
      ? await generateDocumentNumber(currentDocument.type, tx)
      : undefined;

    const document = await tx.document.update({
      where: { id },
      data: {
        status: newStatus,
        ...(documentNumber ? { documentNumber } : {}),
        ...(enteringConfirmed ? { reservesStock: true } : {}),
      },
    });

    if (currentDocument.sourceInvoiceId && (oldStatus === "PAID" || newStatus === "PAID")) {
      await syncInvoicePaymentStatus(tx, currentDocument.sourceInvoiceId);
    }
    return { document, enteringConfirmed };
  });

  // Advisory-only: report what would be short, never blocking and never writing.
  let shortages: StockShortage[] = [];
  if (enteringConfirmed) {
    const result = await checkAvailabilityForDocument(id);
    shortages = result.shortages;
  }

  revalidatePath("/stock");
  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  return serialize({ ...document, shortages });
}

export async function getDocumentForShare(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { sequence: "asc" } },
      paymentTerms: { orderBy: { sequence: "asc" } },
      depositDeductions: { orderBy: { sequence: "asc" } },
      company: true,
      createdBy: true,
    },
  });

  if (!document) throw new Error("ไม่พบเอกสาร");

  // Use live company data directly instead of manually picking fields
  // to ensure new fields are always included
  const result = {
    ...document,
    companySnapshot: document.company ?? document.companySnapshot,
    createdBy: document.createdBy,
  };

  return serialize(result);
}

export async function getNextCustomInvoiceNumber(documentDate: Date) {
  const number = await generateCustomInvoiceNumber(documentDate);
  return number;
}

export async function deleteDocument(id: string) {
  await assertAdmin();

  await updateDocumentStatus(id, DocumentStatus.CANCELLED);

  revalidatePath("/stock");
  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
}
