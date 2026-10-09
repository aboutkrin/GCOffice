"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

import type { ProfitReportRow } from "@/data/profit-report";
import type { CostSource } from "@/lib/line-cost";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDateShort } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SOURCE_LABELS: Record<CostSource, string> = {
  manual: "กรอกเอง",
  snapshot: "ล็อกไว้ตอนยืนยันบิล",
  variant: "เฉลี่ยจากล็อต (สีนี้)",
  product: "เฉลี่ยจากล็อต (สินค้า)",
  legacy: "จากหน้าต้นทุนสินค้า",
  none: "ยังไม่มีต้นทุน",
};

export function MarginBadge({ percent }: { percent: number }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "tabular-nums",
        percent < 10 && "border-red-300 text-red-700",
        percent >= 10 && percent < 25 && "border-amber-300 text-amber-700",
        percent >= 25 && "border-emerald-300 text-emerald-700"
      )}
    >
      {percent.toFixed(1)}%
    </Badge>
  );
}

export function ProfitReportTable({ rows }: { rows: ProfitReportRow[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>วันที่</TableHead>
          <TableHead>เลขที่ / ลูกค้า</TableHead>
          <TableHead className="text-right">ยอดขาย (ไม่รวม VAT)</TableHead>
          <TableHead className="text-right">ต้นทุนสินค้า</TableHead>
          <TableHead className="text-right">ค่าส่งจริง</TableHead>
          <TableHead className="text-right">กำไร</TableHead>
          <TableHead className="text-right">% กำไร</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const expanded = !!open[r.documentId];
          return (
            <Fragment key={r.documentId}>
              <TableRow
                className="cursor-pointer"
                onClick={() => setOpen((prev) => ({ ...prev, [r.documentId]: !prev[r.documentId] }))}
              >
                <TableCell>
                  {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatThaiDateShort(new Date(r.documentDate))}</TableCell>
                <TableCell className="max-w-64">
                  <Link
                    href={`/quotations/${r.documentId}/profit`}
                    className="text-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.documentNumber ?? "ร่าง"}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">{r.customerName}</p>
                  {r.missingCostLines > 0 && (
                    <p className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="size-3" />
                      ไม่มีต้นทุน {r.missingCostLines} รายการ
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatBaht(r.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBaht(r.cogs)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBaht(r.actualDeliveryCost)}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    r.profit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {formatBaht(r.profit)}
                </TableCell>
                <TableCell className="text-right">
                  <MarginBadge percent={r.marginPercent} />
                </TableCell>
              </TableRow>
              {expanded && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell />
                  <TableCell colSpan={7} className="py-2">
                    <div className="space-y-1 text-sm">
                      {r.lines.map((l) => (
                        <div
                          key={l.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 sm:grid-cols-[minmax(0,1fr)_80px_200px_120px_120px]"
                        >
                          <span className="break-words">
                            {l.productSku && <span className="text-muted-foreground mr-1.5 block font-mono text-xs whitespace-nowrap sm:inline">{l.productSku}</span>}
                            {l.productName}
                            {l.colorVariantName && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {l.colorVariantName}
                                {l.colorVariantSku && <span className="font-mono text-xs whitespace-nowrap"> ({l.colorVariantSku})</span>}
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground text-right tabular-nums">
                            × {l.quantity.toLocaleString("th-TH")}
                          </span>
                          <span
                            className={cn(
                              "hidden text-xs sm:block",
                              l.unitCost == null ? "text-amber-700" : "text-muted-foreground"
                            )}
                          >
                            {SOURCE_LABELS[l.source]}
                          </span>
                          <span className="hidden text-right tabular-nums sm:block">
                            {l.unitCost != null ? `${formatBaht(l.unitCost)}/หน่วย` : "-"}
                          </span>
                          <span className="hidden text-right tabular-nums sm:block">
                            {l.unitCost != null ? formatBaht(l.unitCost * l.quantity) : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
