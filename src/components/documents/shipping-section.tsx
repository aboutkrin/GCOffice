"use client";

import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import { formatNumber } from "@/lib/thai-currency";

interface ShippingSectionProps {
  shippingCost: number;
  onShippingCostChange: (value: number) => void;
}

export function ShippingSection({
  shippingCost,
  onShippingCostChange,
}: ShippingSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">ค่าจัดส่ง</Label>
      </div>
      <div className="flex items-center gap-3">
        <DecimalInput
          value={shippingCost || ""}
          onChange={onShippingCostChange}
          placeholder="0.00"
          className="w-[200px]"
        />
        <span className="text-sm text-muted-foreground">บาท</span>
      </div>
      {shippingCost > 0 && (
        <p className="text-xs text-muted-foreground">
          ค่าจัดส่ง {formatNumber(shippingCost)} บาท จะถูกรวมในยอดรวมทั้งสิ้น
        </p>
      )}
    </div>
  );
}
