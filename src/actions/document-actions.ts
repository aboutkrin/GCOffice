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
  const grandTotal = afterDiscount + vatAmount;

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
      grandTotal,
      footerNotes: validated.footerNotes,
      productionDays: validated.productionDays,
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
        grandTotal,
        footerNotes: validated.footerNotes,
        productionDays: validated.productionDays,
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

export async function deleteDocument(id: string) {
  await prisma.document.delete({ where: { id } });
  revalidatePath("/quotations");
  revalidatePath("/invoices");
}
