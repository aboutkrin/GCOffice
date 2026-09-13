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

function formatZodError(error: ZodError): string {
  return error.issues
    .map((i) => {
      const field = i.path.join(".");
      return field ? `${field}: ${i.message}` : i.message;
    })
    .join(", ");
}

export async function createDocument(data: unknown, options?: { asDraft?: boolean }) {
  try {
    const validated = documentSchema.parse(data);

    const user = await requireUserAction();

    const asDraft = options?.asDraft ?? false;
    const documentNumber = asDraft ? null : await generateDocumentNumber(validated.type);

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
      // Create document first (without nested line items / payment terms)
      const doc = await tx.document.create({
        data: {
          type: validated.type,
          status,
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
  await requireUserAction();

  // Fetch current status to determine reservation actions
  const currentDocument = await prisma.document.findUniqueOrThrow({
    where: { id },
    select: { status: true, type: true, reservesStock: true, documentNumber: true },
  });

  const oldStatus = currentDocument.status;
  const newStatus = status;

  // Cancelling a document that has already moved past DRAFT is an admin-only action.
  if (newStatus === DocumentStatus.CANCELLED && oldStatus !== DocumentStatus.DRAFT) {
    await assertAdmin();
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
  // doesn't consume one).
  const needsDocumentNumber =
    oldStatus === DocumentStatus.DRAFT &&
    newStatus !== DocumentStatus.DRAFT &&
    newStatus !== DocumentStatus.CANCELLED &&
    !currentDocument.documentNumber;
  const documentNumber = needsDocumentNumber
    ? await generateDocumentNumber(currentDocument.type)
    : undefined;

  const document = await prisma.document.update({
    where: { id },
    data: {
      status: newStatus,
      ...(documentNumber ? { documentNumber } : {}),
      ...(enteringConfirmed ? { reservesStock: true } : {}),
    },
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

  const result = {
    ...document,
    companySnapshot: document.company
      ? {
          name: document.company.name,
          address: document.company.address,
          phone: document.company.phone,
          email: document.company.email,
          facebook: document.company.facebook,
          instagram: document.company.instagram,
          lineOa: document.company.lineOa,
          tiktok: document.company.tiktok,
          logoUrl: document.company.logoUrl,
          bankName: document.company.bankName,
          bankLogoUrl: document.company.bankLogoUrl,
          accountName: document.company.accountName,
          accountNumber: document.company.accountNumber,
          promptpayQrUrl: document.company.promptpayQrUrl,
          taxId: document.company.taxId,
        }
      : document.companySnapshot,
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

  // Cancelling drops the document out of the reserving statuses, so its
  // reservation (if any) simply disappears from the derived query. Nothing
  // to restore — on-hand was never touched by confirming in the first place.
  await prisma.document.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/stock");
  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
}
