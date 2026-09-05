"use server";

import { prisma } from "@/lib/prisma";
import { documentSchema } from "@/lib/validators";
import { generateDocumentNumber, generateCustomInvoiceNumber } from "@/lib/document-number";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DocumentStatus, PaymentTermType } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { toUTCNoon } from "@/lib/thai-date";
import { ZodError } from "zod";
import {
  deductStockForDocument,
  restoreStockForDocument,
  type StockShortage,
} from "@/actions/stock-actions";

const STOCK_DEDUCTED_STATUSES: DocumentStatus[] = [
  DocumentStatus.CONFIRMED,
  DocumentStatus.SHIPPED,
];

function formatZodError(error: ZodError): string {
  return error.issues
    .map((i) => {
      const field = i.path.join(".");
      return field ? `${field}: ${i.message}` : i.message;
    })
    .join(", ");
}

export async function createDocument(data: unknown) {
  try {
    const validated = documentSchema.parse(data);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false as const, error: "ไม่ได้เข้าสู่ระบบ" };

    const documentNumber = await generateDocumentNumber(validated.type);

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
    const shippingCost = validated.shippingCost || 0;
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

    // Normalize documentDate to UTC noon (client may have already done this, but ensure consistency)
    const documentDate = toUTCNoon(new Date(validated.documentDate));

    const document = await prisma.$transaction(async (tx: any) => {
      // Create document first (without nested line items / payment terms)
      const doc = await tx.document.create({
        data: {
          type: validated.type,
          status: statusMap[validated.type],
          documentNumber,
          customInvoiceNumber: customInvoiceNumber || undefined,
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
          shippingLocation: !validated.freeShipping && shippingCost > 0
            ? validated.shippingLocation?.trim() || null
            : null,
          freeShipping: validated.freeShipping,
          freeShippingLocation: validated.freeShipping
            ? validated.freeShippingLocation?.trim() || null
            : null,
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
          (item: { sequence: number; productSku?: string; productName: string; productImage?: string; colorVariantName?: string; showImage: boolean; details?: string; quantity: number; unitPrice: number }) => ({
            documentId: doc.id,
            sequence: item.sequence,
            productSku: item.productSku,
            productName: item.productName,
            productImage: item.productImage,
            colorVariantName: item.colorVariantName,
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

      // Return full document with relations
      return tx.document.findUniqueOrThrow({
        where: { id: doc.id },
        include: { lineItems: true, paymentTerms: true },
      });
    });

    revalidatePath("/quotations");
    revalidatePath("/invoices");
    revalidatePath("/receipts");
    return { success: true as const, data: serialize(document) };
  } catch (error) {
    console.error("createDocument error:", error);
    if (error instanceof ZodError) {
      return { success: false as const, error: `ข้อมูลไม่ถูกต้อง: ${formatZodError(error)}` };
    }
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างเอกสาร";
    return { success: false as const, error: message };
  }
}

export async function updateDocument(id: string, data: unknown) {
  try {
    const validated = documentSchema.parse(data);

    // Calculate totals
    const subtotal = validated.lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * Number(item.unitPrice),
      0
    );

    const shippingCost = validated.shippingCost || 0;
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
      // Delete old items
      await tx.documentLineItem.deleteMany({ where: { documentId: id } });
      await tx.documentPaymentTerm.deleteMany({ where: { documentId: id } });

      // Update document fields (without nested creates)
      await tx.document.update({
        where: { id },
        data: {
          documentDate,
          customInvoiceNumber: validated.type === "RECEIPT"
            ? (validated.customInvoiceNumber?.trim() || undefined)
            : undefined,
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
          shippingLocation: !validated.freeShipping && shippingCost > 0
            ? validated.shippingLocation?.trim() || null
            : null,
          freeShipping: validated.freeShipping,
          freeShippingLocation: validated.freeShipping
            ? validated.freeShippingLocation?.trim() || null
            : null,
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
          (item: { sequence: number; productSku?: string; productName: string; productImage?: string; colorVariantName?: string; showImage: boolean; details?: string; quantity: number; unitPrice: number }) => ({
            documentId: id,
            sequence: item.sequence,
            productSku: item.productSku,
            productName: item.productName,
            productImage: item.productImage,
            colorVariantName: item.colorVariantName,
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

      // Return full document with relations
      return tx.document.findUniqueOrThrow({
        where: { id },
        include: { lineItems: true, paymentTerms: true },
      });
    });

    revalidatePath("/quotations");
    revalidatePath("/invoices");
    revalidatePath("/receipts");
    return { success: true as const, data: serialize(document) };
  } catch (error) {
    console.error("updateDocument error:", error);
    if (error instanceof ZodError) {
      return { success: false as const, error: `ข้อมูลไม่ถูกต้อง: ${formatZodError(error)}` };
    }
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกเอกสาร";
    return { success: false as const, error: message };
  }
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus
) {
  // Fetch current status to determine stock actions
  const currentDocument = await prisma.document.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });

  const oldStatus = currentDocument.status;
  const newStatus = status;

  // Update the status
  const document = await prisma.document.update({
    where: { id },
    data: { status: newStatus },
  });

  // Stock deduction/restore logic
  let shortages: StockShortage[] = [];

  const wasDeducted = STOCK_DEDUCTED_STATUSES.includes(oldStatus);
  const shouldDeduct = newStatus === DocumentStatus.CONFIRMED && !wasDeducted;
  const shouldRestore = newStatus === DocumentStatus.CANCELLED && wasDeducted;

  if (shouldDeduct) {
    const result = await deductStockForDocument(id);
    shortages = result.shortages;
  } else if (shouldRestore) {
    await restoreStockForDocument(id);
  }

  if (shouldDeduct || shouldRestore) {
    revalidatePath("/stock");
  }

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
  return serialize({ ...document, shortages });
}

export async function getDocumentForShare(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { sequence: "asc" } },
      paymentTerms: { orderBy: { sequence: "asc" } },
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
  // Fetch current status to check if stock needs restoring
  const currentDocument = await prisma.document.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });

  await prisma.document.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  // Restore stock if the document had stock deducted
  const wasDeducted = STOCK_DEDUCTED_STATUSES.includes(currentDocument.status);
  if (wasDeducted) {
    await restoreStockForDocument(id);
    revalidatePath("/stock");
  }

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
}
