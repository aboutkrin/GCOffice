"use server";

import { prisma } from "@/lib/prisma";
import { documentSchema } from "@/lib/validators";
import { generateDocumentNumber } from "@/lib/document-number";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export async function createDocument(data: unknown) {
  const validated = documentSchema.parse(data);

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

  let discountAmount = 0;
  if (validated.discountType === "PERCENTAGE" && validated.discountValue) {
    discountAmount = subtotal * (validated.discountValue / 100);
  } else if (validated.discountType === "AMOUNT" && validated.discountValue) {
    discountAmount = validated.discountValue;
  }

  const afterDiscount = subtotal - discountAmount;
  const vatAmount = validated.vatEnabled
    ? afterDiscount * (validated.vatRate / 100)
    : 0;
  const shippingCost = validated.shippingCost || 0;
  const grandTotal = afterDiscount + vatAmount + shippingCost;

  const document = await prisma.document.create({
    data: {
      type: validated.type,
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
      deliveryDateStart: validated.deliveryDateStart,
      deliveryDateEnd: validated.deliveryDateEnd,
      sourceQuotationId:
        validated.type === "INVOICE" ? validated.sourceQuotationId : undefined,
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
  return serialize(document);
}

export async function updateDocument(id: string, data: unknown) {
  const validated = documentSchema.parse(data);

  // Calculate totals
  const subtotal = validated.lineItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0
  );
  let discountAmount = 0;
  if (validated.discountType === "PERCENTAGE" && validated.discountValue) {
    discountAmount = subtotal * (validated.discountValue / 100);
  } else if (validated.discountType === "AMOUNT" && validated.discountValue) {
    discountAmount = validated.discountValue;
  }
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = validated.vatEnabled
    ? afterDiscount * (validated.vatRate / 100)
    : 0;
  const shippingCost = validated.shippingCost || 0;
  const grandTotal = afterDiscount + vatAmount + shippingCost;

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
        deliveryDateStart: validated.deliveryDateStart ?? null,
        deliveryDateEnd: validated.deliveryDateEnd ?? null,
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
}
