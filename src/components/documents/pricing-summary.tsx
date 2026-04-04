"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/thai-currency";

interface PricingSummaryProps {
  subtotal: number;
  discountType?: "PERCENTAGE" | "AMOUNT" | null;
  discountValue?: number;
  onDiscountTypeChange: (value: "PERCENTAGE" | "AMOUNT" | null) => void;
  onDiscountValueChange: (value: number) => void;
  discountAmount: number;
  vatEnabled: boolean;
  vatRate: number;
  onVatEnabledChange: (value: boolean) => void;
  vatAmount: number;
  shippingCost?: number;
  grandTotal: number;
}

export function PricingSummary({
  subtotal,
  discountType,
  discountValue = 0,
  onDiscountTypeChange,
  onDiscountValueChange,
  discountAmount,
  vatEnabled,
  vatRate,
  onVatEnabledChange,
  vatAmount,
  shippingCost = 0,
  grandTotal,
}: PricingSummaryProps) {
  return (
    <div className="space-y-3">
      {/* Subtotal */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">รวมเป็นเงิน</span>
        <span className="text-sm font-medium">{formatNumber(subtotal)} บาท</span>
      </div>

      {/* Shipping */}
      {shippingCost > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ค่าจัดส่ง</span>
          <span className="text-sm font-medium">
            {formatNumber(shippingCost)} บาท
          </span>
        </div>
      )}

      {/* Discount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ส่วนลด</span>
          <span className="text-sm font-medium text-red-600">
            {discountAmount > 0 ? `- ${formatNumber(discountAmount)} บาท` : "-"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={discountType || "NONE"}
            onValueChange={(val) =>
              onDiscountTypeChange(
                val === "NONE" ? null : (val as "PERCENTAGE" | "AMOUNT")
              )
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">ไม่มีส่วนลด</SelectItem>
              <SelectItem value="PERCENTAGE">เปอร์เซ็นต์ (%)</SelectItem>
              <SelectItem value="AMOUNT">จำนวนเงิน (฿)</SelectItem>
            </SelectContent>
          </Select>
          {discountType && (
            <Input
              type="number"
              step="any"
              min={0}
              value={discountValue || ""}
              onChange={(e) => onDiscountValueChange(Number(e.target.value))}
              placeholder={discountType === "PERCENTAGE" ? "%" : "฿"}
              className="w-[120px]"
            />
          )}
        </div>
      </div>

      {/* After Discount */}
      {discountAmount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            ราคาหลังหักส่วนลด
          </span>
          <span className="text-sm font-medium">
            {formatNumber(subtotal + shippingCost - discountAmount)} บาท
          </span>
        </div>
      )}

      {/* VAT */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              ภาษีมูลค่าเพิ่ม ({vatRate}%)
            </span>
            <Switch
              checked={vatEnabled}
              onCheckedChange={onVatEnabledChange}
              size="sm"
            />
          </div>
          <span className="text-sm font-medium">
            {vatEnabled ? `${formatNumber(vatAmount)} บาท` : "-"}
          </span>
        </div>
      </div>

      {/* Grand Total */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">รวมทั้งสิ้น</span>
          <span className="text-xl font-bold text-primary">
            {formatNumber(grandTotal)} บาท
          </span>
        </div>
      </div>
    </div>
  );
}
