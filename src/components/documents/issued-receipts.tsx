import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import { RECEIPT_PAYMENT_LABELS, type ReceiptPaymentKind } from "@/lib/receipt-payment";

export interface IssuedReceipt {
  id: string;
  documentNumber: string | null;
  customInvoiceNumber?: string | null;
  status?: string;
  documentDate?: string | Date | null;
  /** Decimal on the server, number/string after serialize(). */
  netPayable: unknown;
  receiptPaymentType?: ReceiptPaymentKind | string | null;
}

/** Receipts already issued against an invoice, each linking to its preview (so the deposit receipt is easy to find again). */
export function IssuedReceiptsList({ receipts, excludeId, emptyText }: {
  receipts: IssuedReceipt[];
  excludeId?: string;
  emptyText?: string;
}) {
  const rows = receipts.filter((r) => r.id !== excludeId);
  if (rows.length === 0) {
    return emptyText ? <p className="text-sm text-muted-foreground">{emptyText}</p> : null;
  }
  return (
    <ul className="divide-y rounded-md border text-sm">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
          <Link href={`/receipts/${r.id}/preview`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            {r.customInvoiceNumber || r.documentNumber || "ร่าง"}
            <ExternalLink className="h-3 w-3" />
          </Link>
          {r.receiptPaymentType && RECEIPT_PAYMENT_LABELS[r.receiptPaymentType as ReceiptPaymentKind] && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
              {RECEIPT_PAYMENT_LABELS[r.receiptPaymentType as ReceiptPaymentKind]}
            </span>
          )}
          {r.documentDate && (
            <span className="text-muted-foreground">{formatThaiDate(new Date(r.documentDate), "short")}</span>
          )}
          {r.status && r.status !== "PAID" && (
            <span className="text-xs text-muted-foreground">({DOCUMENT_STATUS_LABELS[r.status as keyof typeof DOCUMENT_STATUS_LABELS] ?? r.status})</span>
          )}
          <span className="ml-auto font-medium">{formatBaht(Number(r.netPayable))}</span>
        </li>
      ))}
    </ul>
  );
}
