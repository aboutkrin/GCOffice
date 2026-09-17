"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Package, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StockCodeResolution } from "@/lib/stock-code";

const QUANTITY_LABELS: Record<"RECEIVE" | "ISSUE" | "COUNT", string> = {
  RECEIVE: "จำนวนรับเข้า",
  ISSUE: "จำนวนเบิกออก",
  COUNT: "จำนวนที่นับได้",
};

interface ScanQuantityPromptProps {
  resolution: Extract<StockCodeResolution, { kind: "variant" | "product" }>;
  documentType: "RECEIVE" | "ISSUE" | "COUNT";
  pending: boolean;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

/**
 * Shown right after a successful scan, before the line is added — lets the
 * warehouse worker type the actual quantity instead of scanning the same
 * code N times or hunting for the line in the list below to edit it.
 */
export function ScanQuantityPrompt({
  resolution,
  documentType,
  pending,
  onConfirm,
  onCancel,
}: ScanQuantityPromptProps) {
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The camera sheet just closed — make sure this doesn't end up off-screen
    // below the fold on a phone.
    containerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirm = () => {
    if (quantity <= 0 || pending) return;
    onConfirm(quantity);
  };

  return (
    <div ref={containerRef} className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="rounded bg-muted flex items-center justify-center size-10 shrink-0 text-muted-foreground">
          <Package className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {resolution.productName}
            {resolution.kind === "variant" && (
              <span className="text-muted-foreground font-normal"> — {resolution.colorVariantName}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground font-mono">{resolution.productSku}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground shrink-0">{QUANTITY_LABELS[documentType]}</label>
        <Input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirm();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          className="h-9 w-24 text-center font-mono"
          disabled={pending}
        />
        <div className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
          <X className="size-4" />
          ยกเลิก
        </Button>
        <Button type="button" size="sm" onClick={confirm} disabled={pending || quantity <= 0}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          เพิ่ม
        </Button>
      </div>
    </div>
  );
}
