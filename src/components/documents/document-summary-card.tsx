import Link from "next/link";
import { Eye, FileText, Pencil } from "lucide-react";

import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentStatusBadge } from "./document-status-badge";

interface SummaryLine {
  id: string;
  productSku: string | null;
  productName: string;
  colorVariantName: string | null;
  colorVariantSku: string | null;
  quantity: number;
  unitPrice: unknown;
  lineTotal: unknown;
}

interface SummaryCustomer {
  type?: string;
  companyName?: string | null;
  customerName?: string | null;
  phone?: string | null;
}

export interface DocumentSummaryData {
  id: string;
  documentNumber: string | null;
  documentDate: Date | string;
  status: string;
  customer: SummaryCustomer;
  lineItems: SummaryLine[];
  subtotal: unknown;
  shippingCost: unknown;
  discountAmount: unknown;
  vatEnabled: boolean;
  vatRate: unknown;
  vatAmount: unknown;
  grandTotal: unknown;
}

/** Read-only summary of a quotation as it was issued (the profit page shows this instead of the edit form). */
export function DocumentSummaryCard({ doc, basePath }: { doc: DocumentSummaryData; basePath: string }) {
  const c = doc.customer;
  const customerName = (c.type === "COMPANY" && c.companyName) || c.customerName || "-";
  const shipping = Number(doc.shippingCost);
  const discount = Number(doc.discountAmount);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            {doc.documentNumber ?? "ร่าง"}
            <DocumentStatusBadge status={doc.status} />
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {customerName}
            {c.phone && ` · ${c.phone}`} · {formatThaiDate(new Date(doc.documentDate))}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/${doc.id}/preview`}>
              <Eye /> ดูใบเสนอราคา
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`${basePath}/${doc.id}`}>
              <Pencil /> แก้ไข
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y text-sm">
          {doc.lineItems.map((l) => (
            <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-2 sm:grid-cols-[minmax(0,1fr)_70px_110px_120px]">
              <p className="break-words">
                {l.productSku && <span className="text-muted-foreground mr-1.5 block font-mono text-xs whitespace-nowrap sm:inline">{l.productSku}</span>}
                {l.productName}
                {l.colorVariantName && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {l.colorVariantName}
                    {l.colorVariantSku && <span className="font-mono text-xs whitespace-nowrap"> ({l.colorVariantSku})</span>}
                  </span>
                )}
              </p>
              <p className="text-muted-foreground hidden text-right tabular-nums sm:block">
                × {l.quantity.toLocaleString("th-TH")}
              </p>
              <p className="text-muted-foreground hidden text-right tabular-nums sm:block">{formatBaht(Number(l.unitPrice))}</p>
              <p className="text-right font-medium tabular-nums">
                <span className="text-muted-foreground mr-2 text-xs font-normal sm:hidden">
                  {l.quantity.toLocaleString("th-TH")} × {formatBaht(Number(l.unitPrice))}
                </span>
                {formatBaht(Number(l.lineTotal))}
              </p>
            </div>
          ))}
        </div>
        <dl className="bg-muted/50 ml-auto max-w-sm space-y-1 rounded-md p-3 text-sm">
          <Row label="รวมเป็นเงิน" value={Number(doc.subtotal)} />
          {shipping > 0 && <Row label="ค่าขนส่ง" value={shipping} />}
          {discount > 0 && <Row label="ส่วนลด" value={-discount} />}
          {doc.vatEnabled && <Row label={`VAT ${Number(doc.vatRate)}%`} value={Number(doc.vatAmount)} />}
          <div className="flex justify-between border-t pt-1 font-semibold">
            <dt>ยอดรวมทั้งสิ้น</dt>
            <dd className="tabular-nums">{formatBaht(Number(doc.grandTotal))}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{formatBaht(value)}</dd>
    </div>
  );
}
