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
      customInvoiceNumber = validated.customInvoiceNumber?.trim() ||
        await generateCustomInvoiceNumber(new Date(validated.documentDate));
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
  const document = await prisma.document.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
  return serialize(document);
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
  await prisma.document.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
}
