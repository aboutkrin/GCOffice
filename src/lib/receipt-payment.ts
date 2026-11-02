/** Money arithmetic uses integer satang so allocations always reconcile. */
export const satang = (amount: unknown): number => Math.round(Number(amount) * 100);
export type ReceiptPaymentKind = "FULL" | "DEPOSIT" | "BALANCE";
export const RECEIPT_PAYMENT_LABELS: Record<ReceiptPaymentKind, string> = {
  FULL: "เต็มจำนวน", DEPOSIT: "มัดจำ", BALANCE: "ยอดคงเหลือ",
};
/**
 * The receipt a new payment defaults to, so staff never pick a type: the receipt
 * is named after the invoice it pays (มัดจำ invoice → มัดจำ receipt, ยอดคงเหลือ
 * invoice → ยอดคงเหลือ receipt), a plain invoice is เต็มจำนวน on the first payment
 * and ยอดคงเหลือ once something has been paid. The amount is what is still owed.
 */
export function defaultReceiptPayment(invoice: {
  invoiceBillingType?: ReceiptPaymentKind | null; isDepositInvoice?: boolean | null;
  total: number; paid: number;
}): { type: ReceiptPaymentKind; amount: number } {
  const remaining = (satang(invoice.total) - satang(invoice.paid)) / 100;
  const billing = invoice.invoiceBillingType ?? (invoice.isDepositInvoice ? "DEPOSIT" : "FULL");
  if (billing === "DEPOSIT") return { type: "DEPOSIT", amount: remaining };
  if (billing === "BALANCE" || satang(invoice.paid) > 0) return { type: "BALANCE", amount: remaining };
  return { type: "FULL", amount: remaining };
}
export interface ReceiptPaymentSummary {
  invoiceNumber: string;
  invoiceTotal: number;
  previousPayments: number;
  paymentAmount: number;
  remainingBalance: number;
}

export function calculateReceiptPayment(input: {
  total: number; invoiceVat: number; paid: number; paidVat: number;
  /** Invoice VAT % (0 when VAT is off); partial payments extract VAT at rate/(100+rate). */
  vatRate: number;
  type: ReceiptPaymentKind; requested: number;
}) {
  const total = satang(input.total);
  const paid = satang(input.paid);
  const remaining = total - paid;
  const amount = satang(input.requested);
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
    throw new Error("ยอดรับชำระต้องมากกว่า 0 และไม่เกินยอดคงเหลือ กรุณาโหลดข้อมูลใหม่");
  }
  if (input.type === "FULL" && (paid !== 0 || amount !== total)) {
    throw new Error("รับชำระเต็มจำนวนได้เฉพาะใบแจ้งหนี้ที่ยังไม่มีการรับชำระ");
  }
  // A balance invoice may be paid in one go (paid === 0), so BALANCE only means "the whole rest".
  if (input.type === "BALANCE" && amount !== remaining) {
    throw new Error("ยอดคงเหลือเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่ก่อนบันทึก");
  }
  const vatRemaining = satang(input.invoiceVat) - satang(input.paidVat);
  // Pro-rating the invoice's already-rounded VAT can be a satang off; the final payment absorbs the difference.
  const vat = amount === remaining ? vatRemaining
    : Math.min(vatRemaining, Math.round(amount * input.vatRate / (100 + input.vatRate)));
  if (vat < 0 || vat > amount) throw new Error("ยอดภาษีของใบเสร็จก่อนหน้าไม่สอดคล้องกับใบแจ้งหนี้");
  return { amount: amount / 100, vat: vat / 100, base: (amount - vat) / 100, remaining: (remaining - amount) / 100 };
}
