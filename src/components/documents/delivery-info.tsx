"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThaiDate, toUTCNoon } from "@/lib/thai-date";

interface DeliveryInfoProps {
  documentType: "QUOTATION" | "INVOICE" | "RECEIPT";
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
  deliveryCompletedDate: Date | null;
  onDeliveryCompletedDateChange: (value: Date | null) => void;
}

export function DeliveryInfo({
  documentType,
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
  deliveryCompletedDate,
  onDeliveryCompletedDateChange,
}: DeliveryInfoProps) {
  const isReceipt = documentType === "RECEIPT";
  const [completedDatePopoverOpen, setCompletedDatePopoverOpen] = useState(false);

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

      {isReceipt ? (
        <div className="space-y-2">
          <Label>วันที่จัดส่งสินค้าสำเร็จ <span className="text-destructive">*</span></Label>
          <Popover open={completedDatePopoverOpen} onOpenChange={setCompletedDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !deliveryCompletedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deliveryCompletedDate
                  ? formatThaiDate(deliveryCompletedDate, "short")
                  : "เลือกวันที่จัดส่งสำเร็จ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={deliveryCompletedDate ?? undefined}
                onSelect={(date) => {
                  onDeliveryCompletedDateChange(date ? toUTCNoon(date) : null);
                  setCompletedDatePopoverOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <>
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
                <Label className="text-sm font-medium">ข้ามวันอาทิตย์</Label>
                <p className="text-xs text-muted-foreground">
                  นับเฉพาะวันจันทร์-เสาร์
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
        </>
      )}
    </div>
  );
}
