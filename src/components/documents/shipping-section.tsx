"use client";

import { DecimalInput } from "@/components/ui/decimal-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, MapPin } from "lucide-react";

interface ShippingSectionProps {
  shippingCost: number;
  onShippingCostChange: (value: number) => void;
  shippingLocation?: string;
  onShippingLocationChange?: (value: string) => void;
  freeShipping: boolean;
  onFreeShippingChange: (value: boolean) => void;
  freeShippingLocation?: string;
  onFreeShippingLocationChange?: (value: string) => void;
  error?: string;
}

export function ShippingSection({
  shippingCost,
  onShippingCostChange,
  shippingLocation = "",
  onShippingLocationChange,
  freeShipping,
  onFreeShippingChange,
  freeShippingLocation = "",
  onFreeShippingLocationChange,
  error,
}: ShippingSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">
          {"ค่าจัดส่ง"} <span className="text-destructive">*</span>
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
        <span className="text-sm text-muted-foreground">{"บาท"}</span>
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
          {"จัดส่งฟรี"}
        </label>
      </div>
      {!freeShipping && shippingCost > 0 && (
        <div className="space-y-1.5 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="shippingLocation" className="text-sm font-medium">
              {"สถานที่จัดส่ง"}
            </Label>
          </div>
          <Input
            id="shippingLocation"
            value={shippingLocation}
            onChange={(e) => onShippingLocationChange?.(e.target.value)}
            placeholder="เช่น หน้างาน / ทั่วประเทศ"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">
            {"ข้อความนี้จะแสดงเป็นตัวสีแดงใต้ยอดรวมในบิล (เว้นว่างได้ หากไม่ต้องการระบุสถานที่)"}
          </p>
        </div>
      )}
      {freeShipping && (
        <div className="space-y-1.5 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="freeShippingLocation" className="text-sm font-medium">
              {"จัดส่งฟรีที่"}
            </Label>
          </div>
          <Input
            id="freeShippingLocation"
            value={freeShippingLocation}
            onChange={(e) => onFreeShippingLocationChange?.(e.target.value)}
            placeholder="เช่น หน้างาน / ทั่วประเทศ"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">
            {"ข้อความนี้จะแสดงเป็นตัวสีแดงใต้ยอดรวมในบิล (เว้นว่างได้ หากไม่ต้องการระบุสถานที่)"}
          </p>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
