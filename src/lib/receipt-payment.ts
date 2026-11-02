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
  /** "30%": this payment as a share of the order (see `receiptPaymentPercentLabel`); absent on old receipts. */
  paymentPercent?: string | null;
}

/**
 * A payment as a share of a total ("10%", "33.33%"), derived from the amounts so
 * it is right whether it was entered as ฿, as a % or picked from a payment term.
 * Null when unknown. Shared with deposit / balance invoices.
 */
export function paymentPercentLabel(amount: number, total: number): string | null {
  const base = satang(total);
  const part = satang(amount);
  if (!Number.isFinite(base) || !Number.isFinite(part) || base <= 0 || part <= 0) return null;
  const percent = Math.round((part / base) * 10000) / 100;
  if (percent <= 0) return null;
  return `${percent.toFixed(2).replace(/\.?0+$/, "")}%`;
}

/**
 * The % printed on a มัดจำ / ยอดคงเหลือ receipt: the share of the whole order
 * (the quotation total when the invoice is itself a deposit / balance invoice,
 * else the invoice total), so a receipt that pays a 30% deposit invoice in full
 * reads "30%", not "100%". เต็มจำนวน receipts carry no %.
 */
export function receiptPaymentPercentLabel(
  type: ReceiptPaymentKind, amount: number, invoice: { total: number; quotationTotal?: number | null },
): string | null {
  if (type === "FULL") return null;
  const base = invoice.quotationTotal && satang(invoice.quotationTotal) > 0 ? invoice.quotationTotal : invoice.total;
  return paymentPercentLabel(amount, base);
}

/** The single generated line on a receipt: "รับชำระมัดจำ 30% ตามใบแจ้งหนี้เลขที่ INV-…". */
export function receiptPaymentLineName(
  type: ReceiptPaymentKind, invoiceNumber: string | null, percent?: string | null,
): string {
  return `รับชำระ${RECEIPT_PAYMENT_LABELS[type]}${percent ? ` ${percent}` : ""} ตามใบแจ้งหนี้เลขที่ ${invoiceNumber ?? "-"}`;
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
