"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";

import { formatThaiDate } from "@/lib/thai-date";
import { STOCK_DOCUMENT_STATUS_COLORS, STOCK_DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import type { DeliveryNoteListItem, DeliveryNoteSuggestion } from "@/data/delivery-notes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DeliveryNoteTableProps {
  notes: DeliveryNoteListItem[];
  /** Quotations matching the search that have no delivery round yet. */
  suggestions?: DeliveryNoteSuggestion[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  search: string;
}

export function DeliveryNoteTable({
  notes,
  suggestions = [],
  total,
  page,
  perPage,
  totalPages,
  search,
}: DeliveryNoteTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!("page" in updates)) params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Debounce typing so each keystroke doesn't trigger a server round trip.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);
  const onSearchChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ search: value.trim() }), 300);
  };

  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, total);

  return (
    <div className="space-y-4">
      <Input
        placeholder="ค้นหาเลขใบส่งสินค้า / ใบเสนอราคา / ใบแจ้งหนี้ / ลูกค้า / PO..."
        defaultValue={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขใบส่งสินค้า</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead>ใบเสนอราคา</TableHead>
              <TableHead>ลูกค้า</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>ผู้สร้าง</TableHead>
              <TableHead className="text-right">พิมพ์</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {search ? (
                    <div className="space-y-2">
                      <p>ไม่พบใบส่งสินค้าที่ตรงกับ “{search}”</p>
                      {suggestions.length > 0 ? (
                        <div className="space-y-1 text-sm">
                          {suggestions.map((s) => (
                            <p key={s.id}>
                              {s.matchedInvoiceNumber
                                ? `ใบแจ้งหนี้ ${s.matchedInvoiceNumber} ออกจากใบเสนอราคา `
                                : "ใบเสนอราคา "}
                              <Link href={`/quotations/${s.id}`} className="font-mono font-medium text-primary hover:underline">
                                {s.documentNumber ?? "ร่าง"}
                              </Link>
                              {" "}({s.customerName}) ยังไม่มีรอบส่ง — เปิดใบเสนอราคาแล้วกด “สร้างรอบส่งใหม่” ในการ์ด “การส่งสินค้า”
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm">
                          ค้นได้จากเลขใบส่งสินค้า (DN-…) เลขใบเบิก เลขใบเสนอราคา เลขใบแจ้งหนี้ ชื่อลูกค้า หรือเลข PO
                        </p>
                      )}
                    </div>
                  ) : (
                    <>ยังไม่มีใบส่งสินค้า — เปิดใบเสนอราคาที่ยืนยันแล้ว แล้วกด “สร้างรอบส่งใหม่” ในการ์ด “การส่งสินค้า”</>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell>
                    <Link href={`/stock/issue/${note.id}`} className="font-mono font-medium text-primary hover:underline">
                      {note.deliveryNumber ?? note.issueNumber}
                    </Link>
                    {!note.deliveryNumber && (
                      <span className="ml-2 text-xs text-muted-foreground">ยังไม่ออกเลข</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatThaiDate(new Date(note.date))}</TableCell>
                  <TableCell>
                    <Link href={`/quotations/${note.quotation.id}`} className="text-muted-foreground hover:underline">
                      {note.quotation.documentNumber ?? "ร่าง"}
                    </Link>
                  </TableCell>
                  <TableCell>{note.customerName}</TableCell>
                  <TableCell className="text-right tabular-nums">{note.totalQuantity.toLocaleString("th-TH")}</TableCell>
                  <TableCell>
                    <Badge className={STOCK_DOCUMENT_STATUS_COLORS[note.status]}>
                      {STOCK_DOCUMENT_STATUS_LABELS[note.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{note.createdBy}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/stock/issue/${note.id}/delivery-note`}>
                        <Printer className="size-4" />
                        ใบส่งสินค้า
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง {startItem}-{endItem} จาก {total} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <span className="text-sm text-muted-foreground">
              หน้า {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
