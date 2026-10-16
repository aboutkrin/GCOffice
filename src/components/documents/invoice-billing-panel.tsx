"use client";

import { Label } from "@/components/ui/label";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import { INVOICE_BILLING_LABELS, satang, type InvoiceBillingKind } from "@/lib/invoice-billing";
import { CheckCircle2, FileText, PiggyBank, Scale } from "lucide-react";
import type { ReactNode } from "react";

export interface BillingQuotationOption {
  id: string;
  documentNumber: string | null;
  grandTotal: number | string;
  vatAmount?: number | string;
  lineItems: { productImage?: string | null; productName?: string; colorVariantName?: string | null }[];
  paymentTerms: { name: string; calculatedAmount: number | string }[];
  /** Deposit invoices already issued off this quotation. */
  invoices: { id: string; documentNumber: string | null; documentDate: string | Date; grandTotal: number | string; status?: string }[];
}

const TYPE_STYLES: Record<InvoiceBillingKind, { accent: string; chip: string; icon: typeof FileText; hint: string }> = {
  FULL: { accent: "border-l-green-500", chip: "bg-green-100 text-green-800", icon: CheckCircle2, hint: "เรียกเก็บทั้งยอดใบเสนอราคาในใบเดียว" },
  DEPOSIT: { accent: "border-l-amber-500", chip: "bg-amber-100 text-amber-800", icon: PiggyBank, hint: "เรียกเก็บเงินมัดจำบางส่วนก่อน ออกได้หลายใบ" },
  BALANCE: { accent: "border-l-blue-500", chip: "bg-blue-100 text-blue-800", icon: Scale, hint: "เรียกเก็บยอดที่เหลือ หักเงินมัดจำที่เรียกเก็บแล้วให้อัตโนมัติ" },
};

interface InvoiceBillingPanelProps {
  quotation: BillingQuotationOption;
  thumbs?: ReactNode;
  /** Empty until the user picks one: a new invoice has no default type. */
  billingType: InvoiceBillingKind | "";
  onBillingTypeChange: (type: InvoiceBillingKind) => void;
  basis: "AMOUNT" | "PERCENTAGE";
  onBasisChange: (basis: "AMOUNT" | "PERCENTAGE") => void;
  value: number;
  onValueChange: (value: number) => void;
  selectedTermIndex: string;
  onSelectTerm: (index: string) => void;
  quotationTotal: number;
  previousDeposits: number;
  remaining: number;
  amount: number;
  /** Editing an invoice that already has paid receipts: type / amount locked. */
  locked?: boolean;
  /** Shown under the type select when saving without a type. */
  billingTypeError?: string;
  /** Shown under the term select when saving a deposit without a term. */
  termError?: string;
}

const EMPTY_STYLE = { accent: "border-l-muted-foreground/40", hint: "กรุณาเลือกประเภทการเรียกเก็บก่อนบันทึก" };

/**
 * "เรียกเก็บตามใบเสนอราคา": the invoice counterpart of the receipt's
 * FULL / DEPOSIT / BALANCE panel. Shows what the quotation is worth, what has
 * already been invoiced as deposits, and what this invoice will bill.
 */
export function InvoiceBillingPanel({
  quotation, thumbs, billingType, onBillingTypeChange, basis, onBasisChange, value, onValueChange,
  selectedTermIndex, onSelectTerm, quotationTotal, previousDeposits, remaining, amount, locked = false,
  billingTypeError, termError,
}: InvoiceBillingPanelProps) {
  const style = billingType ? TYPE_STYLES[billingType] : EMPTY_STYLE;
  const Icon = billingType ? TYPE_STYLES[billingType].icon : FileText;
  const paymentTerms = quotation.paymentTerms || [];
  const afterThis = (satang(remaining) - satang(amount)) / 100;
  const deposits = quotation.invoices || [];

  return (
    <div id="invoice-billing-section" className={cn("mb-4 space-y-4 rounded-lg border border-l-4 p-4", style.accent)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <p className="font-medium">เรียกเก็บตามใบเสนอราคา {quotation.documentNumber ?? "-"}</p>
        </div>
        {billingType && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", TYPE_STYLES[billingType].chip)}>
            ใบแจ้งหนี้{INVOICE_BILLING_LABELS[billingType]}
          </span>
        )}
      </div>
      {thumbs}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="ยอดใบเสนอราคา" value={quotationTotal} />
        <Stat label="เรียกเก็บมัดจำแล้ว" value={previousDeposits} tone={previousDeposits > 0 ? "amber" : undefined} />
        <Stat label="คงเหลือที่ยังไม่เรียกเก็บ" value={remaining} tone="blue" />
      </div>

      {deposits.length > 0 && (
        <ul className="space-y-1 rounded-md bg-amber-50/60 p-2 text-xs text-amber-900">
          {deposits.map((d) => (
            <li key={d.id} className="flex justify-between gap-2">
              <span>มัดจำ {d.documentNumber ?? "ร่าง"} · {formatThaiDate(new Date(d.documentDate), "short")}</span>
              <span className="font-medium">{formatBaht(Number(d.grandTotal))}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Label>ประเภทการเรียกเก็บ <span className="text-destructive">*</span></Label>
        <Select value={billingType} onValueChange={(v) => onBillingTypeChange(v as InvoiceBillingKind)} disabled={locked}>
          <SelectTrigger className={cn("w-full", billingTypeError && "border-destructive")} aria-invalid={!!billingTypeError}>
            <SelectValue placeholder="เลือกประเภทการเรียกเก็บ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL" disabled={previousDeposits > 0}>เต็มจำนวน</SelectItem>
            <SelectItem value="DEPOSIT" disabled={satang(remaining) <= 0}>มัดจำ</SelectItem>
            <SelectItem value="BALANCE" disabled={previousDeposits <= 0}>ยอดคงเหลือ</SelectItem>
          </SelectContent>
        </Select>
        {billingTypeError
          ? <p className="text-xs text-destructive">{billingTypeError}</p>
          : <p className="text-xs text-muted-foreground">{style.hint}</p>}
      </div>

      {billingType === "DEPOSIT" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>เลือกงวดชำระ {paymentTerms.length > 0 && <span className="text-destructive">*</span>}</Label>
            <Select value={selectedTermIndex} onValueChange={onSelectTerm} disabled={locked || paymentTerms.length === 0}>
              <SelectTrigger className={cn("w-full", termError && "border-destructive")} aria-invalid={!!termError}>
                <SelectValue placeholder={paymentTerms.length > 0 ? "เลือกงวดชำระ" : "ใบเสนอราคานี้ไม่มีงวดชำระ"} />
              </SelectTrigger>
              <SelectContent>
                {paymentTerms.map((term, index) => (
                  <SelectItem key={index} value={String(index)}>{term.name} — {formatBaht(Number(term.calculatedAmount))}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {termError && <p className="text-xs text-destructive">{termError}</p>}
          </div>
          <div className="space-y-2">
            <Label>ระบุยอดเป็น</Label>
            <Select value={basis} onValueChange={(v) => onBasisChange(v as "AMOUNT" | "PERCENTAGE")} disabled={locked}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AMOUNT">จำนวนเงิน (฿)</SelectItem>
                <SelectItem value="PERCENTAGE">เปอร์เซ็นต์ของยอดใบเสนอราคา</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{basis === "PERCENTAGE" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงินรวมภาษี (฿)"}</Label>
            <DecimalInput value={value || ""} onChange={onValueChange} disabled={locked} />
          </div>
        </div>
      )}

      {billingType && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted p-3">
          <strong>เรียกเก็บ{INVOICE_BILLING_LABELS[billingType]}ครั้งนี้ {formatBaht(amount)}</strong>
          <span className={cn("text-sm", afterThis < 0 ? "text-destructive" : "text-muted-foreground")}>
            คงเหลือหลังใบนี้ {formatBaht(afterThis)}
          </span>
        </div>
      )}
      {billingType && billingType !== "FULL" && (
        <p className="text-xs text-muted-foreground">
          รายการสินค้า ยอดรวม ภาษี และงวดชำระจะถูกสร้างจากใบเสนอราคาให้อัตโนมัติ
          ช่องทางการชำระที่พิมพ์ในใบคือบัญชีของบริษัทตามใบเสนอราคา
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" | "blue" }) {
  return (
    <div className={cn(
      "rounded-md border px-3 py-2",
      tone === "amber" && "border-amber-200 bg-amber-50",
      tone === "blue" && "border-blue-200 bg-blue-50",
    )}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{formatBaht(value)}</div>
    </div>
  );
}
