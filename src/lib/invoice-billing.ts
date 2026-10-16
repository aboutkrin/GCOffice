import { calculateReceiptPayment, satang, type ReceiptPaymentKind } from "./receipt-payment";

export { satang };
export type InvoiceBillingKind = ReceiptPaymentKind;

/** Thai badge / select labels, same wording as receipts. */
export const INVOICE_BILLING_LABELS: Record<InvoiceBillingKind, string> = {
  FULL: "เต็มจำนวน", DEPOSIT: "มัดจำ", BALANCE: "ยอดคงเหลือ",
};

export const INVOICE_BILLING_COLORS: Record<InvoiceBillingKind, string> = {
  FULL: "bg-green-100 text-green-800",
  DEPOSIT: "bg-amber-100 text-amber-800",
  BALANCE: "bg-blue-100 text-blue-800",
};

/** Snapshot stored on the invoice so the print never changes when the quotation does. */
export interface InvoiceBillingSummary {
  quotationNumber: string;
  quotationTotal: number;
  /** Deposit invoices already issued off the quotation before this one (incl. VAT). */
  previousDeposits: number;
  billedAmount: number;
  remainingBalance: number;
}

/** Document title printed on the invoice. */
export function invoiceBillingTitle(type?: InvoiceBillingKind | null): string {
  if (type === "DEPOSIT") return "ใบแจ้งหนี้มัดจำ";
  if (type === "BALANCE") return "ใบแจ้งหนี้ยอดคงเหลือ";
  return "ใบแจ้งหนี้";
}

/** Name of the single generated line / payment term on a deposit or balance invoice. */
export function invoiceBillingLineName(type: InvoiceBillingKind, quotationNumber: string | null): string {
  const label = type === "DEPOSIT" ? "เงินมัดจำ" : "ยอดคงเหลือ";
  return `เรียกเก็บ${label} ตามใบเสนอราคาเลขที่ ${quotationNumber ?? "-"}`;
}

const INVOICE_MESSAGES: Record<string, string> = {
  "ยอดรับชำระต้องมากกว่า 0 และไม่เกินยอดคงเหลือ กรุณาโหลดข้อมูลใหม่": "ยอดเรียกเก็บต้องมากกว่า 0 และไม่เกินยอดที่ยังไม่ได้เรียกเก็บ กรุณาโหลดข้อมูลใหม่",
  "รับชำระเต็มจำนวนได้เฉพาะใบแจ้งหนี้ที่ยังไม่มีการรับชำระ": "ออกใบแจ้งหนี้เต็มจำนวนได้เฉพาะใบเสนอราคาที่ยังไม่มีใบแจ้งหนี้มัดจำ",
  "ยอดคงเหลือเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่ก่อนบันทึก": "ยอดคงเหลือของใบเสนอราคาเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่ก่อนบันทึก",
  "ยอดภาษีของใบเสร็จก่อนหน้าไม่สอดคล้องกับใบแจ้งหนี้": "ยอดภาษีของใบแจ้งหนี้มัดจำก่อนหน้าไม่สอดคล้องกับใบเสนอราคา",
};

/**
 * Same satang-exact split as receipts (deposit ≤ remaining, FULL only when
 * nothing was issued, BALANCE = exact remainder, VAT prorated and reconciled
 * on the last one) with invoice wording in the errors.
 */
export function calculateInvoiceBilling(input: {
  total: number; quotationVat: number; issued: number; issuedVat: number;
  vatRate: number; type: InvoiceBillingKind; requested: number;
}) {
  try {
    return calculateReceiptPayment({
      total: input.total, invoiceVat: input.quotationVat, paid: input.issued, paidVat: input.issuedVat,
      vatRate: input.vatRate, type: input.type, requested: input.requested,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(INVOICE_MESSAGES[message] ?? message);
  }
}
