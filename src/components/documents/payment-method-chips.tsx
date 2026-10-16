"use client";

import { Banknote, CreditCard, Landmark, MoreHorizontal, QrCode } from "lucide-react";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PaymentMethodKind = (typeof PAYMENT_METHOD_OPTIONS)[number];

export const PAYMENT_METHOD_ICONS: Record<PaymentMethodKind, typeof Banknote> = {
  CASH: Banknote,
  TRANSFER: Landmark,
  CREDIT_CARD: CreditCard,
  PROMPTPAY: QrCode,
  OTHER: MoreHorizontal,
};

/** "ช่องทางที่ลูกค้าชำระ" picker: one tappable chip per PaymentMethod. */
export function PaymentMethodChips({
  value,
  onChange,
  compact = false,
}: {
  value: PaymentMethodKind | null;
  onChange: (method: PaymentMethodKind) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-5" : "grid-cols-3 sm:grid-cols-5")}>
      {PAYMENT_METHOD_OPTIONS.map((option) => {
        const Icon = PAYMENT_METHOD_ICONS[option];
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-colors",
              active
                ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {PAYMENT_METHOD_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
