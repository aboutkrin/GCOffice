import type { Prisma } from "@/generated/prisma/client";
import { calculateReceiptPayment, RECEIPT_PAYMENT_LABELS, satang, type ReceiptPaymentKind, type ReceiptPaymentSummary } from "./receipt-payment";

type Tx = Prisma.TransactionClient;

export async function lockInvoice(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM documents WHERE id = ${id} FOR UPDATE`;
}

export async function paidReceipts(tx: Tx, invoiceId: string, excludeId?: string) {
  return tx.document.findMany({
    where: { sourceInvoiceId: invoiceId, type: "RECEIPT", status: "PAID", ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { netPayable: true, vatAmount: true },
  });
}

export async function syncInvoicePaymentStatus(tx: Tx, invoiceId: string) {
  const invoice = await tx.document.findUniqueOrThrow({ where: { id: invoiceId } });
  const receipts = await paidReceipts(tx, invoiceId);
  const paid = receipts.reduce((sum, r) => sum + satang(r.netPayable), 0);
  if (paid > satang(invoice.netPayable)) throw new Error("ยอดรับชำระเกินยอดใบแจ้งหนี้");
  if (invoice.status === "CANCELLED" || invoice.status === "DRAFT") {
    if (paid > 0) throw new Error("ไม่สามารถรับชำระใบแจ้งหนี้ร่างหรือยกเลิกแล้ว");
    return;
  }
  await tx.document.update({ where: { id: invoiceId }, data: {
    status: paid === 0 ? "BILLED" : paid < satang(invoice.netPayable) ? "DEPOSITED" : "PAID",
  } });
}

/** Caller holds the invoice lock for the entire write transaction. */
export async function applyReceiptPayment(tx: Tx, id: string, input: {
  sourceInvoiceId: string; type: ReceiptPaymentKind; amount: number;
}, preserveSummary = false) {
  const invoice = await tx.document.findUniqueOrThrow({
    where: { id: input.sourceInvoiceId }, include: { lineItems: true },
  });
  if (invoice.type !== "INVOICE" || !["BILLED", "DEPOSITED", "PAID"].includes(invoice.status)) {
    throw new Error("กรุณาเลือกใบแจ้งหนี้ที่ออกแล้วและยังไม่ยกเลิก");
  }
  const current = await tx.document.findUniqueOrThrow({ where: { id } });
  const receipts = await paidReceipts(tx, invoice.id, id);
  const paid = receipts.reduce((sum, r) => sum + satang(r.netPayable), 0) / 100;
  const paidVat = receipts.reduce((sum, r) => sum + satang(r.vatAmount), 0) / 100;
  // Legacy invoice deductions already include tax: allocate only the payable share.
  const invoiceVat = satang(invoice.grandTotal) > 0
    ? Number(invoice.vatAmount) * Number(invoice.netPayable) / Number(invoice.grandTotal) : 0;
  if (preserveSummary && current.receiptPaymentSummary) {
    const snapshot = current.receiptPaymentSummary as unknown as ReceiptPaymentSummary;
    if (satang(snapshot.invoiceTotal) !== satang(invoice.netPayable)
      || current.companyId !== invoice.companyId || current.customerId !== invoice.customerId
      || current.vatEnabled !== invoice.vatEnabled || Number(current.vatRate) !== Number(invoice.vatRate)) {
      throw new Error("ใบแจ้งหนี้เปลี่ยนแปลง กรุณาสร้างใบเสร็จใหม่หรือเปลี่ยนเป็นร่างเพื่อตรวจสอบยอด");
    }
    if (satang(paid) + satang(current.netPayable) > satang(invoice.netPayable)) {
      throw new Error("ยอดรับชำระเกินยอดใบแจ้งหนี้");
    }
    return;
  }
  const calculated = calculateReceiptPayment({ total: Number(invoice.netPayable), invoiceVat,
    paid, paidVat, type: input.type, requested: input.amount });
  const summary: ReceiptPaymentSummary = {
    invoiceNumber: invoice.documentNumber ?? "", invoiceTotal: Number(invoice.netPayable),
    previousPayments: paid, paymentAmount: calculated.amount, remainingBalance: calculated.remaining,
  };
  const full = input.type === "FULL";
  const copyFull = full && satang(invoice.depositDeduction) === 0;
  await tx.document.update({ where: { id }, data: {
    receiptPaymentType: input.type, receiptPaymentSummary: { ...summary },
    companyId: invoice.companyId, customerId: invoice.customerId,
    companySnapshot: invoice.companySnapshot as Prisma.InputJsonValue,
    customerSnapshot: invoice.customerSnapshot as Prisma.InputJsonValue,
    subtotal: copyFull ? invoice.subtotal : calculated.base,
    discountType: copyFull ? invoice.discountType : null,
    discountValue: copyFull ? invoice.discountValue : null,
    discountAmount: copyFull ? invoice.discountAmount : 0,
    shippingCost: copyFull ? invoice.shippingCost : 0,
    shippingLocation: copyFull ? invoice.shippingLocation : null,
    freeShipping: copyFull && invoice.freeShipping,
    freeShippingLocation: copyFull ? invoice.freeShippingLocation : null,
    pickupAtShowroom: copyFull && invoice.pickupAtShowroom,
    vatEnabled: invoice.vatEnabled, vatRate: invoice.vatRate, vatAmount: calculated.vat,
    grandTotal: calculated.amount, netPayable: calculated.amount, depositDeduction: 0,
    isDepositInvoice: false, depositPercent: null,
  } });
  await tx.documentLineItem.deleteMany({ where: { documentId: id } });
  await tx.documentPaymentTerm.deleteMany({ where: { documentId: id } });
  await tx.documentDepositDeduction.deleteMany({ where: { documentId: id } });
  const items = copyFull ? invoice.lineItems.map((item) => ({
    documentId: id, sequence: item.sequence, productSku: item.productSku,
    productName: item.productName, productImage: item.productImage,
    colorVariantName: item.colorVariantName, colorVariantSku: item.colorVariantSku,
    showImage: item.showImage, details: item.details, quantity: item.quantity,
    unitPrice: item.unitPrice, lineTotal: item.lineTotal,
    productId: item.productId, colorVariantId: item.colorVariantId,
  })) : [{
    documentId: id, sequence: 1, productName: `รับชำระ${RECEIPT_PAYMENT_LABELS[input.type]} ตามใบแจ้งหนี้เลขที่ ${invoice.documentNumber}`,
    quantity: 1, unitPrice: calculated.base, lineTotal: calculated.base, showImage: false,
  }];
  await tx.documentLineItem.createMany({ data: items });
}
