"use client";

import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import { INVOICE_BILLING_LABELS, satang, type InvoiceBillingChoice, type InvoiceBillingKind } from "@/lib/invoice-billing";
import { CheckCircle2, FileText, PencilLine, PiggyBank, Scale } from "lucide-react";
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

const TYPE_STYLES: Record<InvoiceBillingKind, { accent: string; chip: string; active: string; icon: typeof FileText; hint: string }> = {
  FULL: {
    accent: "border-l-green-500", chip: "bg-green-100 text-green-800", icon: CheckCircle2,
    active: "border-green-500 bg-green-50 text-green-900 ring-1 ring-green-500",
    hint: "เรียกเก็บทั้งยอดใบเสนอราคาในใบเดียว แก้ไขรายการได้ด้านล่าง",
  },
  DEPOSIT: {
    accent: "border-l-amber-500", chip: "bg-amber-100 text-amber-800", icon: PiggyBank,
    active: "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500",
    hint: "เรียกเก็บเงินมัดจำบางส่วนก่อน ออกได้หลายใบ",
  },
  BALANCE: {
    accent: "border-l-blue-500", chip: "bg-blue-100 text-blue-800", icon: Scale,
    active: "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500",
    hint: "เรียกเก็บยอดที่เหลือทั้งหมด หักเงินมัดจำที่เรียกเก็บแล้วให้อัตโนมัติ",
  },
};

interface InvoiceBillingPanelProps {
  quotation: BillingQuotationOption;
  thumbs?: ReactNode;
  choices: InvoiceBillingChoice[];
  /** Key of the picked choice; "" until the user (or the recommendation) picks one. */
  selectedKey: string;
  onSelectChoice: (key: string) => void;
  /** CUSTOM deposit only. */
  basis: "AMOUNT" | "PERCENTAGE";
  onBasisChange: (basis: "AMOUNT" | "PERCENTAGE") => void;
  value: number;
  onValueChange: (value: number) => void;
  quotationTotal: number;
  previousDeposits: number;
  remaining: number;
  amount: number;
  /** Editing an invoice that already has paid receipts: type / amount locked. */
  locked?: boolean;
  /** Shown under the cards when saving without a choice. */
  billingTypeError?: string;
}

/**
 * "เรียกเก็บตามใบเสนอราคา": what the quotation is worth, what has already been
 * invoiced as deposits, and one tappable card per thing this invoice can bill
 * (full, a payment term as deposit, the balance, or a custom deposit).
 */
export function InvoiceBillingPanel({
  quotation, thumbs, choices, selectedKey, onSelectChoice, basis, onBasisChange, value, onValueChange,
  quotationTotal, previousDeposits, remaining, amount, locked = false, billingTypeError,
}: InvoiceBillingPanelProps) {
  const selected = choices.find((c) => c.key === selectedKey);
  const billingType = selected?.type;
  const style = billingType ? TYPE_STYLES[billingType] : null;
  const Icon = style?.icon ?? FileText;
  const afterThis = (satang(remaining) - satang(amount)) / 100;
  const deposits = quotation.invoices || [];
  const isCustom = selected?.key === "CUSTOM";

  return (
    <div id="invoice-billing-section" className={cn("mb-4 space-y-4 rounded-lg border border-l-4 p-4", style?.accent ?? "border-l-muted-foreground/40")}>
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
        <Label>เรียกเก็บครั้งนี้ <span className="text-destructive">*</span></Label>
        {choices.length === 0 ? (
          <p className="text-sm text-muted-foreground">ใบเสนอราคานี้เรียกเก็บครบแล้ว</p>
        ) : (
          <div
            role="radiogroup"
            aria-invalid={!!billingTypeError}
            className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3", billingTypeError && "rounded-md ring-1 ring-destructive")}
          >
            {choices.map((choice) => {
              const active = choice.key === selectedKey;
              const ChoiceIcon = choice.key === "CUSTOM" ? PencilLine : TYPE_STYLES[choice.type].icon;
              return (
                <button
                  key={choice.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={locked}
                  onClick={() => onSelectChoice(choice.key)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    active ? TYPE_STYLES[choice.type].active : "border-border hover:bg-muted",
                  )}
                >
                  <ChoiceIcon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "" : "text-muted-foreground")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{choice.label}</span>
                      {choice.recommended && !active && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">แนะนำ</span>
                      )}
                    </span>
                    {choice.detail && <span className="block truncate text-xs text-muted-foreground">{choice.detail}</span>}
                    <span className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-base font-semibold">{choice.amount === null ? "ระบุยอดเอง" : formatBaht(choice.amount)}</span>
                      {choice.percent && <span className="text-xs text-muted-foreground">{choice.percent}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {billingTypeError
          ? <p className="text-xs text-destructive">{billingTypeError}</p>
          : <p className="text-xs text-muted-foreground">{style?.hint ?? "เลือกว่าใบนี้เรียกเก็บยอดไหน"}</p>}
      </div>

      {isCustom && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
          <div className="space-y-2">
            <Label>ระบุยอดเป็น</Label>
            <div className="flex gap-1" role="radiogroup">
              {(["AMOUNT", "PERCENTAGE"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={basis === option}
                  disabled={locked}
                  onClick={() => onBasisChange(option)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-60",
                    basis === option ? "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option === "AMOUNT" ? "฿ จำนวนเงิน" : "% ของใบเสนอราคา"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{basis === "PERCENTAGE" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงินรวมภาษี (฿)"}</Label>
            <DecimalInput value={value || ""} onChange={onValueChange} disabled={locked} autoFocus />
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
