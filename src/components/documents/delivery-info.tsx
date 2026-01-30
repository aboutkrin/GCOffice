"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { formatThaiDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

interface DeliveryInfoProps {
  footerNotes?: string;
  onFooterNotesChange: (value: string) => void;
  productionDays?: string;
  onProductionDaysChange: (value: string) => void;
  deliveryDateStart?: Date | null;
  onDeliveryDateStartChange: (value: Date | undefined) => void;
  deliveryDateEnd?: Date | null;
  onDeliveryDateEndChange: (value: Date | undefined) => void;
}

export function DeliveryInfo({
  footerNotes,
  onFooterNotesChange,
  productionDays,
  onProductionDaysChange,
  deliveryDateStart,
  onDeliveryDateStartChange,
  deliveryDateEnd,
  onDeliveryDateEndChange,
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

      <div className="space-y-2">
        <Label>ระยะเวลาผลิต/จัดส่ง</Label>
        <Input
          value={productionDays || ""}
          onChange={(e) => onProductionDaysChange(e.target.value)}
          placeholder="เช่น 15-20 วันทำการ"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>วันที่เริ่มจัดส่ง</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !deliveryDateStart && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deliveryDateStart
                  ? formatThaiDate(deliveryDateStart, "short")
                  : "เลือกวันที่"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={deliveryDateStart || undefined}
                onSelect={onDeliveryDateStartChange}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>วันที่สิ้นสุดจัดส่ง</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !deliveryDateEnd && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deliveryDateEnd
                  ? formatThaiDate(deliveryDateEnd, "short")
                  : "เลือกวันที่"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={deliveryDateEnd || undefined}
                onSelect={onDeliveryDateEndChange}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
