"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { stockAdjustmentSchema, type StockAdjustmentFormData } from "@/lib/validators";
import { addStock, removeStock } from "@/actions/stock-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "in" | "out";
  product: {
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
  } | null;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  mode,
  product,
}: StockAdjustmentDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema) as any,
    defaultValues: {
      productId: product?.id ?? "",
      quantity: 1,
      reason: "",
      reference: "",
    },
  });

  // Reset form when product changes
  if (product && form.getValues("productId") !== product.id) {
    form.reset({
      productId: product.id,
      quantity: 1,
      reason: "",
      reference: "",
    });
  }

  function onSubmit(data: StockAdjustmentFormData) {
    startTransition(async () => {
      try {
        if (mode === "in") {
          await addStock(data);
          toast.success(`เพิ่มสต็อค ${data.quantity} ชิ้นเรียบร้อย`);
        } else {
          await removeStock(data);
          toast.success(`ลดสต็อค ${data.quantity} ชิ้นเรียบร้อย`);
        }
        onOpenChange(false);
        form.reset();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "in" ? "เพิ่มสต็อค" : "ลดสต็อค"}
          </DialogTitle>
          <DialogDescription>
            {product?.name} ({product?.sku}) — สต็อคปัจจุบัน: {product?.stockQuantity ?? 0} ชิ้น
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>จำนวน</Label>
            <Input
              type="number"
              min={1}
              max={mode === "out" ? product?.stockQuantity : undefined}
              {...form.register("quantity")}
            />
            {form.formState.errors.quantity && (
              <p className="text-sm text-destructive">
                {form.formState.errors.quantity.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>เหตุผล</Label>
            <Textarea
              placeholder="ระบุเหตุผล (ไม่บังคับ)"
              {...form.register("reason")}
            />
          </div>
          <div className="space-y-2">
            <Label>เลขที่อ้างอิง</Label>
            <Input
              placeholder="เลขที่เอกสารอ้างอิง (ไม่บังคับ)"
              {...form.register("reference")}
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
              {isPending ? "กำลังบันทึก..." : mode === "in" ? "เพิ่มสต็อค" : "ลดสต็อค"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
