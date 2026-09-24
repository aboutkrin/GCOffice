/** Money arithmetic uses integer satang so allocations always reconcile. */
export const satang = (amount: unknown): number => Math.round(Number(amount) * 100);
export type ReceiptPaymentKind = "FULL" | "DEPOSIT" | "BALANCE";
export const RECEIPT_PAYMENT_LABELS: Record<ReceiptPaymentKind, string> = {
  FULL: "เต็มจำนวน", DEPOSIT: "มัดจำ", BALANCE: "ยอดคงเหลือ",
};
export interface ReceiptPaymentSummary {
  invoiceNumber: string;
  invoiceTotal: number;
  previousPayments: number;
  paymentAmount: number;
  remainingBalance: number;
}

export function calculateReceiptPayment(input: {
  total: number; invoiceVat: number; paid: number; paidVat: number;
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
  if (input.type === "BALANCE" && (paid <= 0 || amount !== remaining)) {
    throw new Error("ยอดคงเหลือเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่ก่อนบันทึก");
  }
  const vatRemaining = satang(input.invoiceVat) - satang(input.paidVat);
  const vat = amount === remaining ? vatRemaining : Math.min(vatRemaining, Math.round(satang(input.invoiceVat) * amount / total));
  if (vat < 0 || vat > amount) throw new Error("ยอดภาษีของใบเสร็จก่อนหน้าไม่สอดคล้องกับใบแจ้งหนี้");
  return { amount: amount / 100, vat: vat / 100, base: (amount - vat) / 100, remaining: (remaining - amount) / 100 };
}
