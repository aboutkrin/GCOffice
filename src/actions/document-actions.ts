"use server";

import { prisma } from "@/lib/prisma";
import { documentSchema } from "@/lib/validators";
import { generateDocumentNumber } from "@/lib/document-number";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { toUTCNoon } from "@/lib/thai-date";

export async function createDocument(data: unknown) {
  const validated = documentSchema.parse(data);
  validated.documentDate = toUTCNoon(validated.documentDate);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่ได้เข้าสู่ระบบ");

  const documentNumber = await generateDocumentNumber(validated.type);

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: validated.companyId },
  });
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: validated.customerId },
  });

  const subtotal = validated.lineItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
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
  // VAT is calculated on afterDiscount (which includes shipping)
  const vatAmount = validated.vatEnabled
    ? afterDiscount * (validated.vatRate / 100)
    : 0;
  const grandTotal = afterDiscount + vatAmount;

  const document = await prisma.document.create({
    data: {
      type: validated.type,
      status: validated.type === "QUOTATION" ? DocumentStatus.QUOTED : validated.type === "INVOICE" ? DocumentStatus.BILLED : undefined,
      documentNumber,
      documentDate: validated.documentDate,
      companyId: validated.companyId,
      companySnapshot: JSON.parse(JSON.stringify(company)),
      customerId: validated.customerId,
      customerSnapshot: JSON.parse(JSON.stringify(customer)),
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
      deliveryDateStart: validated.deliveryDateStart ? toUTCNoon(validated.deliveryDateStart) : undefined,
      deliveryDateEnd: validated.deliveryDateEnd ? toUTCNoon(validated.deliveryDateEnd) : undefined,
      sourceQuotationId:
        validated.type === "INVOICE" ? validated.sourceQuotationId : undefined,
      sourceInvoiceId:
        validated.type === "RECEIPT" ? validated.sourceInvoiceId : undefined,
      createdById: user.id,
      lineItems: {
        create: validated.lineItems.map((item) => ({
          sequence: item.sequence,
          productSku: item.productSku,
          productName: item.productName,
          productImage: item.productImage,
          showImage: item.showImage,
          details: item.details,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * Number(item.unitPrice),
        })),
      },
      paymentTerms: validated.paymentTerms
        ? {
            create: validated.paymentTerms.map((term) => ({
              sequence: term.sequence,
              name: term.name,
              type: term.type,
              value: term.value,
              calculatedAmount: term.calculatedAmount,
              note: term.note,
            })),
          }
        : undefined,
    },
    include: { lineItems: true, paymentTerms: true },
  });

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
  return serialize(document);
}

export async function updateDocument(id: string, data: unknown) {
  const validated = documentSchema.parse(data);
  validated.documentDate = toUTCNoon(validated.documentDate);

  // Calculate totals
  const subtotal = validated.lineItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
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
  // VAT is calculated on afterDiscount (which includes shipping)
  const vatAmount = validated.vatEnabled
    ? afterDiscount * (validated.vatRate / 100)
    : 0;
  const grandTotal = afterDiscount + vatAmount;

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

    return tx.document.update({
      where: { id },
      data: {
        documentDate: validated.documentDate,
        companyId: validated.companyId,
        companySnapshot: JSON.parse(JSON.stringify(company)),
        customerId: validated.customerId,
        customerSnapshot: JSON.parse(JSON.stringify(customer)),
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
        deliveryDateStart: validated.deliveryDateStart ? toUTCNoon(validated.deliveryDateStart) : null,
        deliveryDateEnd: validated.deliveryDateEnd ? toUTCNoon(validated.deliveryDateEnd) : null,
        lineItems: {
          create: validated.lineItems.map((item) => ({
            sequence: item.sequence,
            productSku: item.productSku,
            productName: item.productName,
            productImage: item.productImage,
            showImage: item.showImage,
            details: item.details,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * Number(item.unitPrice),
          })),
        },
        paymentTerms: validated.paymentTerms
          ? {
              create: validated.paymentTerms.map((term) => ({
                sequence: term.sequence,
                name: term.name,
                type: term.type,
                value: term.value,
                calculatedAmount: term.calculatedAmount,
                note: term.note,
              })),
            }
          : undefined,
      },
      include: { lineItems: true, paymentTerms: true },
    });
  });

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
  return serialize(document);
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

export async function deleteDocument(id: string) {
  await prisma.document.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
}
