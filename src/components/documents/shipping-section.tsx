"use client";

import { DecimalInput } from "@/components/ui/decimal-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, MapPin } from "lucide-react";

/** ตัวเลือกด่วนสำหรับสถานที่จัดส่ง */
export const BANGKOK_METRO_LOCATION = "กรุงเทพ และ ปริมณฑล";

interface ShippingLocationFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** ที่อยู่ลูกค้าจากหัวบิล (ใช้กับตัวเลือก "ที่อยู่เดียวกับหัวบิลลูกค้า") */
  customerAddress?: string;
}

function ShippingLocationField({
  id,
  label,
  value,
  onChange,
  customerAddress = "",
}: ShippingLocationFieldProps) {
  const trimmedValue = value.trim();
  const trimmedAddress = customerAddress.trim();

  const isBangkokMetro = trimmedValue === BANGKOK_METRO_LOCATION;
  const isCustomerAddress =
    trimmedAddress.length > 0 && trimmedValue === trimmedAddress;

  return (
    <div className="space-y-1.5 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor={id} className="text-sm font-medium">
          {label} <span className="text-destructive">*</span>
        </Label>
      </div>

      {/* ตัวเลือกด่วน */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-0.5">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${id}-bangkok`}
            checked={isBangkokMetro}
            onChange={(e) =>
              onChange(e.target.checked ? BANGKOK_METRO_LOCATION : "")
            }
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
          />
          <label
            htmlFor={`${id}-bangkok`}
            className="text-sm cursor-pointer select-none"
          >
            {BANGKOK_METRO_LOCATION}
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${id}-customer-address`}
            checked={isCustomerAddress}
            disabled={!trimmedAddress}
            onChange={(e) => onChange(e.target.checked ? trimmedAddress : "")}
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <label
            htmlFor={`${id}-customer-address`}
            className={
              trimmedAddress
                ? "text-sm cursor-pointer select-none"
                : "text-sm select-none text-muted-foreground"
            }
          >
            {"ที่อยู่เดียวกับหัวบิลลูกค้า"}
          </label>
        </div>
      </div>

      {!trimmedAddress && (
        <p className="text-xs text-muted-foreground">
          {"(เลือกลูกค้าที่มีที่อยู่ก่อน จึงจะใช้ตัวเลือก \"ที่อยู่เดียวกับหัวบิลลูกค้า\" ได้)"}
        </p>
      )}

      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="เช่น หน้างาน / ทั่วประเทศ"
        maxLength={255}
      />
      <p className="text-xs text-muted-foreground">
        {"ข้อความนี้จะแสดงเป็นตัวสีแดงใต้ยอดรวมในบิล (เว้นว่างได้ หากไม่ต้องการระบุสถานที่)"}
      </p>
    </div>
  );
}

interface ShippingSectionProps {
  shippingCost: number;
  onShippingCostChange: (value: number) => void;
  shippingLocation?: string;
  onShippingLocationChange?: (value: string) => void;
  freeShipping: boolean;
  onFreeShippingChange: (value: boolean) => void;
  freeShippingLocation?: string;
  onFreeShippingLocationChange?: (value: string) => void;
  customerAddress?: string;
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
  customerAddress = "",
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
        <ShippingLocationField
          id="shippingLocation"
          label="สถานที่จัดส่ง"
          value={shippingLocation}
          onChange={(val) => onShippingLocationChange?.(val)}
          customerAddress={customerAddress}
        />
      )}
      {freeShipping && (
        <ShippingLocationField
          id="freeShippingLocation"
          label="จัดส่งฟรีที่"
          value={freeShippingLocation}
          onChange={(val) => onFreeShippingLocationChange?.(val)}
          customerAddress={customerAddress}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
