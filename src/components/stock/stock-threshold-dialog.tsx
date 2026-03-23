"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";

import { updateStockThreshold } from "@/actions/stock-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StockThresholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sku: string;
    lowStockThreshold: number;
  } | null;
  colorVariant?: {
    id: string;
    name: string;
    lowStockThreshold: number;
  } | null;
}

export function StockThresholdDialog({
  open,
  onOpenChange,
  product,
  colorVariant,
}: StockThresholdDialogProps) {
  const [isPending, startTransition] = useTransition();
  const currentThreshold = colorVariant
    ? colorVariant.lowStockThreshold
    : (product?.lowStockThreshold ?? 5);
  const [threshold, setThreshold] = useState(currentThreshold);
  const [prevKey, setPrevKey] = useState("");

  // Sync threshold when product/variant changes
  const key = `${product?.id}-${colorVariant?.id}`;
  if (key !== prevKey) {
    setPrevKey(key);
    setThreshold(currentThreshold);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;

    startTransition(async () => {
      try {
        await updateStockThreshold(product.id, threshold, colorVariant?.id);
        toast.success("อัปเดตจุดแจ้งเตือนเรียบร้อย");
        onOpenChange(false);
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>ตั้งค่าจุดแจ้งเตือน</DialogTitle>
          <DialogDescription>
            {product?.name} ({product?.sku})
            {colorVariant && <> — สี: {colorVariant.name}</>}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>แจ้งเตือนเมื่อสต็อคเหลือ (ชิ้น)</Label>
            <Input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
