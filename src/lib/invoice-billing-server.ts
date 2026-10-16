import type { Prisma } from "@/generated/prisma/client";
import {
  calculateInvoiceBilling, invoiceBillingLineName, INVOICE_BILLING_LABELS, satang,
  type InvoiceBillingKind, type InvoiceBillingSummary,
} from "./invoice-billing";

type Tx = Prisma.TransactionClient;

const ISSUED_STATUSES = ["BILLED", "DEPOSITED", "PAID"] as const;

/** Deposit invoices (new style or legacy isDepositInvoice) issued off a quotation, oldest first. */
export async function issuedDepositInvoices(tx: Tx, quotationId: string, excludeId?: string) {
  return tx.document.findMany({
    where: {
      sourceQuotationId: quotationId, type: "INVOICE", status: { in: [...ISSUED_STATUSES] },
      OR: [{ invoiceBillingType: "DEPOSIT" }, { invoiceBillingType: null, isDepositInvoice: true }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, documentNumber: true, documentDate: true, grandTotal: true, vatAmount: true },
    orderBy: [{ documentDate: "asc" }, { createdAt: "asc" }],
  });
}

/** A non-cancelled FULL / BALANCE invoice (drafts included) already consumes the quotation. */
export async function hasFinalInvoice(tx: Tx, quotationId: string, excludeId?: string) {
  const count = await tx.document.count({
    where: {
      sourceQuotationId: quotationId, type: "INVOICE", status: { not: "CANCELLED" },
      OR: [{ invoiceBillingType: { in: ["FULL", "BALANCE"] } }, { invoiceBillingType: null, isDepositInvoice: false }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return count > 0;
}

/**
 * Write a managed invoice off its quotation. Caller holds the quotation lock
 * (lockDocument) for the whole transaction. With preserveSummary (leaving
 * DRAFT) the stored snapshot is only re-checked against the quotation.
 */
export async function applyInvoiceBilling(tx: Tx, id: string, input: {
  sourceQuotationId: string; type: InvoiceBillingKind; amount: number;
}, preserveSummary = false, options: { keepContent?: boolean } = {}) {
  const quotation = await tx.document.findUniqueOrThrow({
    where: { id: input.sourceQuotationId }, include: { lineItems: { orderBy: { sequence: "asc" } } },
  });
  if (quotation.type !== "QUOTATION" || !["CONFIRMED", "SHIPPED"].includes(quotation.status)) {
    throw new Error("กรุณาเลือกใบเสนอราคาที่ยืนยันแล้วและยังไม่ยกเลิก");
  }
  if (input.type !== "DEPOSIT" && (await hasFinalInvoice(tx, quotation.id, id))) {
    throw new Error("ใบเสนอราคานี้มีใบแจ้งหนี้เต็มจำนวนหรือยอดคงเหลือแล้ว");
  }
  const current = await tx.document.findUniqueOrThrow({ where: { id } });
  const deposits = await issuedDepositInvoices(tx, quotation.id, id);
  const issued = deposits.reduce((sum, d) => sum + satang(d.grandTotal), 0) / 100;
  const issuedVat = deposits.reduce((sum, d) => sum + satang(d.vatAmount), 0) / 100;
  const total = Number(quotation.grandTotal);

  if (preserveSummary && current.invoiceBillingSummary) {
    const snapshot = current.invoiceBillingSummary as unknown as InvoiceBillingSummary;
    if (satang(snapshot.quotationTotal) !== satang(total) || satang(snapshot.previousDeposits) !== satang(issued)
      || current.companyId !== quotation.companyId || current.customerId !== quotation.customerId) {
      throw new Error("ใบเสนอราคาหรือใบแจ้งหนี้มัดจำเปลี่ยนแปลง กรุณาสร้างใบแจ้งหนี้ใหม่");
    }
    if (satang(issued) + satang(current.grandTotal) > satang(total)) throw new Error("ยอดเรียกเก็บเกินยอดใบเสนอราคา");
    return;
  }

  if (options.keepContent) {
    // A FULL invoice edited in the form keeps its own lines and totals (they
    // started as the quotation's); only the type and snapshot are written.
    if (input.type !== "FULL") throw new Error("ใบแจ้งหนี้มัดจำและยอดคงเหลือต้องสร้างจากใบเสนอราคา");
    if (satang(issued) > 0) throw new Error("ออกใบแจ้งหนี้เต็มจำนวนได้เฉพาะใบเสนอราคาที่ยังไม่มีใบแจ้งหนี้มัดจำ");
    const summary: InvoiceBillingSummary = {
      quotationNumber: quotation.documentNumber ?? "", quotationTotal: total,
      previousDeposits: 0, billedAmount: satang(input.amount) / 100, remainingBalance: 0,
    };
    await tx.document.update({ where: { id }, data: { invoiceBillingType: "FULL", invoiceBillingSummary: { ...summary } } });
    return;
  }

  const calculated = calculateInvoiceBilling({
    total, quotationVat: Number(quotation.vatAmount), issued, issuedVat,
    vatRate: quotation.vatEnabled && Number(quotation.vatAmount) > 0 ? Number(quotation.vatRate) : 0,
    type: input.type, requested: input.amount,
  });
  const summary: InvoiceBillingSummary = {
    quotationNumber: quotation.documentNumber ?? "", quotationTotal: total,
    previousDeposits: issued, billedAmount: calculated.amount, remainingBalance: calculated.remaining,
  };
  // Only FULL carries the quotation's own lines and totals; a deposit or
  // balance invoice is one generated line for the amount billed this time
  // (the summary box on the print shows the quotation total and the deposits).
  const copyLines = input.type === "FULL";
  await tx.document.update({ where: { id }, data: {
    invoiceBillingType: input.type, invoiceBillingSummary: { ...summary },
    companyId: quotation.companyId, customerId: quotation.customerId,
    companySnapshot: quotation.companySnapshot as Prisma.InputJsonValue,
    customerSnapshot: quotation.customerSnapshot as Prisma.InputJsonValue,
    subtotal: copyLines ? quotation.subtotal : calculated.base,
    discountType: copyLines ? quotation.discountType : null,
    discountValue: copyLines ? quotation.discountValue : null,
    discountAmount: copyLines ? quotation.discountAmount : 0,
    shippingCost: copyLines ? quotation.shippingCost : 0,
    shippingLocation: copyLines ? quotation.shippingLocation : null,
    freeShipping: copyLines && quotation.freeShipping,
    freeShippingLocation: copyLines ? quotation.freeShippingLocation : null,
    pickupAtShowroom: copyLines && quotation.pickupAtShowroom,
    vatEnabled: quotation.vatEnabled, vatRate: quotation.vatRate,
    vatAmount: copyLines ? quotation.vatAmount : calculated.vat,
    grandTotal: copyLines ? quotation.grandTotal : calculated.amount,
    depositDeduction: 0, netPayable: copyLines ? total : calculated.amount,
    isDepositInvoice: false, depositPercent: null,
  } });
  await tx.documentLineItem.deleteMany({ where: { documentId: id } });
  await tx.documentPaymentTerm.deleteMany({ where: { documentId: id } });
  await tx.documentDepositDeduction.deleteMany({ where: { documentId: id } });
  const items = copyLines ? quotation.lineItems.map((item) => ({
    documentId: id, sequence: item.sequence, productSku: item.productSku,
    productName: item.productName, productImage: item.productImage,
    colorVariantName: item.colorVariantName, colorVariantSku: item.colorVariantSku,
    showImage: item.showImage, details: item.details, quantity: item.quantity,
    unitPrice: item.unitPrice, lineTotal: item.lineTotal,
    productId: item.productId, colorVariantId: item.colorVariantId,
  })) : [{
    documentId: id, sequence: 1, productName: invoiceBillingLineName(input.type, quotation.documentNumber, { amount: calculated.amount, quotationTotal: total }),
    quantity: 1, unitPrice: calculated.base, lineTotal: calculated.base, showImage: false,
  }];
  await tx.documentLineItem.createMany({ data: items });
  if (input.type === "FULL") {
    const terms = await tx.documentPaymentTerm.findMany({ where: { documentId: quotation.id }, orderBy: { sequence: "asc" } });
    if (terms.length) {
      await tx.documentPaymentTerm.createMany({ data: terms.map((t) => ({
        documentId: id, sequence: t.sequence, name: t.name, type: t.type, value: t.value,
        calculatedAmount: t.calculatedAmount, note: t.note,
      })) });
    }
  } else {
    await tx.documentPaymentTerm.create({ data: {
      documentId: id, sequence: 1, name: INVOICE_BILLING_LABELS[input.type], type: "AMOUNT",
      value: calculated.amount, calculatedAmount: calculated.amount,
    } });
  }
}
