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

/**
 * Share of the quotation total billed by this invoice, as printed on the line
 * ("10%", "33.33%"). Derived from the amounts so it is right whether the deposit
 * was entered as ฿, as a % or picked from a payment term. Null when unknown.
 */
export function invoiceBillingPercentLabel(amount: number, quotationTotal: number): string | null {
  const total = satang(quotationTotal);
  const billed = satang(amount);
  if (!Number.isFinite(total) || !Number.isFinite(billed) || total <= 0 || billed <= 0) return null;
  const percent = Math.round((billed / total) * 10000) / 100;
  if (percent <= 0) return null;
  return `${percent.toFixed(2).replace(/\.?0+$/, "")}%`;
}

/**
 * Name of the single generated line / payment term on a deposit or balance
 * invoice. The line carries the % of the quotation it bills
 * ("เรียกเก็บเงินมัดจำ 60% …", "เรียกเก็บยอดคงเหลือ 40% …") when the amounts are known.
 */
export function invoiceBillingLineName(
  type: InvoiceBillingKind, quotationNumber: string | null,
  billing?: { amount: number; quotationTotal: number },
): string {
  const label = type === "DEPOSIT" ? "เงินมัดจำ" : "ยอดคงเหลือ";
  const percent = billing ? invoiceBillingPercentLabel(billing.amount, billing.quotationTotal) : null;
  return `เรียกเก็บ${label}${percent ? ` ${percent}` : ""} ตามใบเสนอราคาเลขที่ ${quotationNumber ?? "-"}`;
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
  // A balance invoice only exists after a deposit invoice (a single bill is FULL); a receipt
  // on a balance invoice may settle it in one go, so the shared math no longer checks this.
  if (input.type === "BALANCE" && satang(input.issued) <= 0) {
    throw new Error("ยอดคงเหลือของใบเสนอราคาเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่ก่อนบันทึก");
  }
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

/** One tappable card on the invoice form: what this invoice can bill off the quotation. */
export interface InvoiceBillingChoice {
  /** "FULL" | "BALANCE" | "TERM:<index>" | "CUSTOM" */
  key: string;
  type: InvoiceBillingKind;
  label: string;
  /** Second line: the payment term behind the amount ("งวด 1 · มัดจำ 30%"). */
  detail?: string;
  /** null = CUSTOM: the user types a ฿ or % amount. */
  amount: number | null;
  percent: string | null;
  /** The one to preselect when the quotation is picked. */
  recommended: boolean;
}

/**
 * Choices offered for an invoice off a quotation, in display order.
 * First invoice (nothing issued): FULL, one deposit per payment term except
 * the last (that one is the balance), and a custom deposit; the first term is
 * recommended. Once a deposit exists: BALANCE (recommended), "มัดจำเพิ่ม" for
 * the terms not billed yet, and a custom extra deposit. FULL is never offered
 * after a deposit. Amounts are capped at what is still unbilled.
 */
export function buildInvoiceBillingChoices(input: {
  quotationTotal: number; previousDeposits: number;
  paymentTerms: { name: string; calculatedAmount: number | string }[];
}): InvoiceBillingChoice[] {
  const total = satang(input.quotationTotal);
  const issued = satang(input.previousDeposits);
  const remaining = total - issued;
  if (!Number.isFinite(total) || total <= 0 || remaining <= 0) return [];
  const terms = input.paymentTerms.map((t, index) => ({ index, name: t.name, amount: satang(t.calculatedAmount) }));
  // The last of several terms is the balance; a single (100%) term is the FULL invoice.
  const depositTerms = terms.length >= 2 ? terms.slice(0, -1) : [];
  const lastTerm = terms.length >= 2 ? terms[terms.length - 1] : null;
  const pct = (amount: number) => invoiceBillingPercentLabel(amount / 100, total / 100);
  const choices: InvoiceBillingChoice[] = [];

  if (issued <= 0) {
    choices.push({ key: "FULL", type: "FULL", label: "เต็มจำนวน", amount: total / 100, percent: pct(total), recommended: false });
    depositTerms.forEach((term, i) => {
      const amount = Math.min(term.amount, remaining);
      if (amount <= 0) return;
      choices.push({
        key: `TERM:${term.index}`, type: "DEPOSIT", label: "มัดจำ", detail: `งวด ${term.index + 1} · ${term.name}`,
        amount: amount / 100, percent: pct(amount), recommended: i === 0,
      });
    });
    choices.push({ key: "CUSTOM", type: "DEPOSIT", label: "มัดจำ กำหนดเอง", amount: null, percent: null, recommended: false });
    return choices;
  }

  // A term counts as billed when the deposits so far cover the terms up to it.
  let cumulative = 0;
  const billedCount = depositTerms.filter((term) => { cumulative += term.amount; return cumulative <= issued; }).length;
  const balanceIsLastTerm = !!lastTerm && billedCount === depositTerms.length && lastTerm.amount === remaining;
  choices.push({
    key: "BALANCE", type: "BALANCE", label: "ยอดคงเหลือ",
    detail: balanceIsLastTerm && lastTerm ? `งวด ${lastTerm.index + 1} · ${lastTerm.name}` : undefined,
    amount: remaining / 100, percent: pct(remaining), recommended: true,
  });
  depositTerms.slice(billedCount).forEach((term) => {
    const amount = Math.min(term.amount, remaining);
    if (amount <= 0 || amount >= remaining) return;
    choices.push({
      key: `TERM:${term.index}`, type: "DEPOSIT", label: "มัดจำเพิ่ม", detail: `งวด ${term.index + 1} · ${term.name}`,
      amount: amount / 100, percent: pct(amount), recommended: false,
    });
  });
  choices.push({ key: "CUSTOM", type: "DEPOSIT", label: "มัดจำเพิ่ม กำหนดเอง", amount: null, percent: null, recommended: false });
  return choices;
}
