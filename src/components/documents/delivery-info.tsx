"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Clock } from "lucide-react";
import { formatThaiDate } from "@/lib/thai-date";

interface DeliveryInfoProps {
  footerNotes?: string;
  onFooterNotesChange: (value: string) => void;
  productionDaysMin: number | null;
  onProductionDaysMinChange: (value: number | null) => void;
  productionDaysMax: number | null;
  onProductionDaysMaxChange: (value: number | null) => void;
  skipWeekends: boolean;
  onSkipWeekendsChange: (value: boolean) => void;
  skipHolidays: boolean;
  onSkipHolidaysChange: (value: boolean) => void;
  productionDaysText: string;
  deliveryDateStart: Date | null;
  deliveryDateEnd: Date | null;
}

export function DeliveryInfo({
  footerNotes,
  onFooterNotesChange,
  productionDaysMin,
  onProductionDaysMinChange,
  productionDaysMax,
  onProductionDaysMaxChange,
  skipWeekends,
  onSkipWeekendsChange,
  skipHolidays,
  onSkipHolidaysChange,
  productionDaysText,
  deliveryDateStart,
  deliveryDateEnd,
}: DeliveryInfoProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>หมายเหตุท้ายเอกสาร</Label>
        <Textarea
          value={footerNotes || ""}
          onChange={(e) => onFooterNotesChange(e.target.value)}
          placeholder="ระบุหมายเหตุเพิ่มเติม..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>จำนวนวันต่ำสุด</Label>
          <Input
            type="number"
            min={1}
            value={productionDaysMin ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onProductionDaysMinChange(val === "" ? null : parseInt(val, 10));
            }}
            placeholder="เช่น 4"
          />
        </div>
        <div className="space-y-2">
          <Label>จำนวนวันสูงสุด</Label>
          <Input
            type="number"
            min={1}
            value={productionDaysMax ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onProductionDaysMaxChange(val === "" ? null : parseInt(val, 10));
            }}
            placeholder="เช่น 7"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">ข้ามวันเสาร์-อาทิตย์</Label>
            <p className="text-xs text-muted-foreground">
              นับเฉพาะวันจันทร์-ศุกร์
            </p>
          </div>
          <Switch
            checked={skipWeekends}
            onCheckedChange={onSkipWeekendsChange}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">ข้ามวันหยุดนักขัตฤกษ์</Label>
            <p className="text-xs text-muted-foreground">
              ข้ามวันหยุดที่กำหนดไว้ในระบบ
            </p>
          </div>
          <Switch
            checked={skipHolidays}
            onCheckedChange={onSkipHolidaysChange}
          />
        </div>
      </div>

      {productionDaysText && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span className="font-medium">ระยะเวลาผลิต/จัดส่ง:</span>
            <span>{productionDaysText}</span>
          </div>
          {deliveryDateStart && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="font-medium">วันที่คาดว่าจะจัดส่ง:</span>
              <span>
                {formatThaiDate(deliveryDateStart, "short")}
                {deliveryDateEnd &&
                  deliveryDateStart.getTime() !== deliveryDateEnd.getTime() &&
                  ` - ${formatThaiDate(deliveryDateEnd, "short")}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
