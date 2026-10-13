"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductThumb } from "@/components/ui/product-thumb";
import {
  updateStockDocumentLine,
  removeStockDocumentLine,
  correctPostedLineQuantity,
} from "@/actions/stock-document-actions";

interface StockDocumentLineRowProps {
  line: any;
  editable: boolean;
  /** ISSUE-against-document rows show ordered/remaining instead of a free quantity stepper. */
  showOrderedProgress?: boolean;
  /** POSTED receive/issue lines: allow fixing a typo (adjusts stock by the difference). */
  correctable?: boolean;
  onChanged: () => void;
}

export function StockDocumentLineRow({
  line,
  editable,
  showOrderedProgress,
  correctable,
  onChanged,
}: StockDocumentLineRowProps) {
  const [isPending, startTransition] = useTransition();
  const [editingPosted, setEditingPosted] = useState(false);
  const [quantity, setQuantity] = useState(line.quantity);

  const commitQuantity = (next: number) => {
    if (next < 0) return;
    setQuantity(next);
    startTransition(async () => {
      try {
        await updateStockDocumentLine(line.id, { quantity: next });
        onChanged();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setQuantity(line.quantity);
      }
    });
  };

  const saveCorrection = () => {
    if (quantity === line.quantity) {
      setEditingPosted(false);
      return;
    }
    startTransition(async () => {
      try {
        await correctPostedLineQuantity(line.id, quantity);
        toast.success("แก้จำนวนและปรับสต็อคเรียบร้อยแล้ว");
        setEditingPosted(false);
        onChanged();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setQuantity(line.quantity);
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeStockDocumentLine(line.id);
        onChanged();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <div className="flex items-center gap-3 border-b py-2 last:border-b-0">
      <ProductThumb src={line.product?.imageUrl} alt={line.productName} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {line.productName}
          {line.colorVariantName && (
            <span className="text-muted-foreground font-normal"> — {line.colorVariantName}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{line.stockCode}</p>
        {showOrderedProgress && line.orderedQuantity != null && (
          <p className="text-xs text-muted-foreground">
            สั่ง {line.orderedQuantity} · เบิกแล้ว {quantity}/{line.orderedQuantity}
          </p>
        )}
      </div>
      {editable ? (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            disabled={isPending || quantity <= 0}
            onClick={() => commitQuantity(quantity - 1)}
          >
            <Minus className="size-3.5" />
          </Button>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            onBlur={() => commitQuantity(quantity)}
            className="h-8 w-16 text-center"
            disabled={isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            disabled={isPending}
            onClick={() => commitQuantity(quantity + 1)}
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={isPending}
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : correctable && editingPosted ? (
        <div className="flex items-center gap-1 shrink-0">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="h-8 w-20 text-center"
            disabled={isPending}
            autoFocus
          />
          <Button type="button" size="icon-xs" disabled={isPending} onClick={saveCorrection}>
            <Check className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={isPending}
            onClick={() => {
              setQuantity(line.quantity);
              setEditingPosted(false);
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-medium">{line.quantity}</span>
          {correctable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="แก้จำนวน"
              onClick={() => setEditingPosted(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
