"use client";

import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import { formatNumber } from "@/lib/thai-currency";

interface ShippingSectionProps {
  shippingCost: number;
  onShippingCostChange: (value: number) => void;
  freeShipping: boolean;
  onFreeShippingChange: (value: boolean) => void;
  error?: string;
}

export function ShippingSection({
  shippingCost,
  onShippingCostChange,
  freeShipping,
  onFreeShippingChange,
  error,
}: ShippingSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">
          ค่าจัดส่ง <span className="text-destructive">*</span>
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <DecimalInput
          value={freeShipping ? "" : (shippingCost || "")}
          onChange={onShippingCostChange}
          placeholder="0.00"
          className="w-[200px]"
          disabled={freeShipping}
        />
        <span className="text-sm text-muted-foreground">บาท</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="freeShipping"
          checked={freeShipping}
          onChange={(e) => {
            onFreeShippingChange(e.target.checked);
            if (e.target.checked) onShippingCostChange(0);
          }}
          className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
        />
        <label
          htmlFor="freeShipping"
          className="text-sm cursor-pointer select-none"
        >
          จัดส่งฟรี
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!freeShipping && shippingCost > 0 && (
        <p className="text-xs text-muted-foreground">
          ค่าจัดส่ง {formatNumber(shippingCost)} บาท จะถูกรวมในยอดรวมทั้งสิ้น
        </p>
      )}
      {freeShipping && (
        <p className="text-xs text-muted-foreground">จัดส่งฟรี ไม่คิดค่าจัดส่ง</p>
      )}
    </div>
  );
}
