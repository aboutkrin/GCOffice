"use client";

import { useState } from "react";
import { ClipboardPaste } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface PastedRow {
  supplierCode: string;
  boxes: number;
  amountCny: number;
  weightKg: number | null;
}

const toNumber = (s: string | undefined) => {
  if (!s) return NaN;
  return Number(s.replace(/[¥￥,\s]/g, ""));
};

/** Rows: รหัส, กล่อง, ยอดเงิน ¥, น้ำหนัก กก. (tab-separated from Excel, or commas) */
export function parsePastedRows(text: string): PastedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(line.includes("\t") ? "\t" : /,|\s{2,}/).map((c) => c.trim()))
    .map((cols) => ({
      supplierCode: cols[0] ?? "",
      boxes: Math.round(toNumber(cols[1])),
      amountCny: toNumber(cols[2]),
      weightKg: Number.isFinite(toNumber(cols[3])) ? toNumber(cols[3]) : null,
    }))
    .filter((r) => r.supplierCode && Number.isFinite(r.boxes) && Number.isFinite(r.amountCny));
}

export function PasteItemsDialog({ onPaste }: { onPaste: (rows: PastedRow[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const rows = parsePastedRows(text);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ClipboardPaste className="size-4" />
          วางจาก Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>วางรายการจาก Excel</DialogTitle>
          <DialogDescription>
            คัดลอก 4 คอลัมน์ตามลำดับ: รหัสสินค้าจีน, จำนวนกล่อง, ยอดเงิน (¥), น้ำหนัก (กก. ไม่บังคับ)
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"YSP125-Q304\t6\t648\t114\nYSP125-Q303\t9\t972\t171"}
          className="font-mono text-xs"
        />
        <p className="text-muted-foreground text-sm">อ่านได้ {rows.length} รายการ</p>
        <DialogFooter>
          <Button
            type="button"
            disabled={rows.length === 0}
            onClick={() => {
              onPaste(rows);
              setText("");
              setOpen(false);
            }}
          >
            เพิ่ม {rows.length} รายการ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
