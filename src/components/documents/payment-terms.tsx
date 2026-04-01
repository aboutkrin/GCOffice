"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { Trash2, AlertTriangle, CalendarDays } from "lucide-react";
import type { PaymentTerm } from "@/hooks/use-payment-terms";
import { PaymentTermTemplateSelect } from "./payment-term-template-select";

interface PaymentTermsProps {
  terms: PaymentTerm[];
  removeTerm: (id: string) => void;
  updateTerm: (id: string, updates: Partial<PaymentTerm>) => void;
  totalAmount: number;
  grandTotal: number;
  paymentTermTemplates?: any[];
  onApplyTemplate?: (templateItems: any[]) => void;
  deliveryCompletedDate?: Date | null;
}

export function PaymentTermsSection({
  terms,
  removeTerm,
  updateTerm,
  totalAmount,
  grandTotal,
  paymentTermTemplates,
  onApplyTemplate,
  deliveryCompletedDate,
}: PaymentTermsProps) {
  const mismatch =
    terms.length > 0 && Math.abs(totalAmount - grandTotal) > 0.01;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <Label className="text-base font-semibold">เงื่อนไขการชำระเงิน</Label>
        <div className="flex items-center gap-2">
          {paymentTermTemplates && paymentTermTemplates.length > 0 && onApplyTemplate && (
            <PaymentTermTemplateSelect
              templates={paymentTermTemplates}
              hasExistingTerms={terms.length > 0}
              onApply={onApplyTemplate}
            />
          )}
        </div>
      </div>

      {terms.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          ยังไม่มีเงื่อนไขการชำระเงิน
        </p>
      )}

      <div className="space-y-3">
        {terms.map((term) => (
          <div
            key={term.id}
            className="flex flex-col sm:flex-row items-start sm:items-end gap-2 p-3 rounded-lg border bg-muted/30"
          >
            <div className="flex-1 w-full sm:w-auto space-y-1">
              <Label className="text-xs text-muted-foreground">
                ชื่องวด
              </Label>
              <Input
                value={term.name}
                onChange={(e) =>
                  updateTerm(term.id, { name: e.target.value })
                }
                placeholder="เช่น งวดที่ 1 - มัดจำ"
                className="h-9"
              />
            </div>

            <div className="w-full sm:w-[130px] space-y-1">
              <Label className="text-xs text-muted-foreground">ประเภท</Label>
              <Select
                value={term.type}
                onValueChange={(val) =>
                  updateTerm(term.id, {
                    type: val as "PERCENTAGE" | "AMOUNT",
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">เปอร์เซ็นต์ (%)</SelectItem>
                  <SelectItem value="AMOUNT">จำนวนเงิน (฿)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[100px] space-y-1">
              <Label className="text-xs text-muted-foreground">ค่า</Label>
              <Input
                type="number"
                min={0}
                value={term.value || ""}
                onChange={(e) =>
                  updateTerm(term.id, { value: Number(e.target.value) })
                }
                placeholder={term.type === "PERCENTAGE" ? "%" : "฿"}
                className="h-9"
              />
            </div>

            <div className="w-full sm:w-[130px] space-y-1">
              <Label className="text-xs text-muted-foreground">
                ยอดชำระ
              </Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm">
                {formatNumber(term.calculatedAmount)}
              </div>
            </div>

            <div className="flex-1 w-full sm:w-auto space-y-1">
              <Label className="text-xs text-muted-foreground">
                หมายเหตุ
              </Label>
              <Input
                value={term.note || ""}
                onChange={(e) =>
                  updateTerm(term.id, { note: e.target.value })
                }
                placeholder="หมายเหตุ"
                className="h-9"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeTerm(term.id)}
              className="text-destructive hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {terms.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium">
            รวมทุกงวด: {formatNumber(totalAmount)} บาท
          </span>
          {mismatch && (
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>ยอดรวมงวดชำระไม่ตรงกับยอดสุทธิ</span>
            </div>
          )}
        </div>
      )}

      {deliveryCompletedDate && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="font-medium">วันที่จัดส่งสินค้าสำเร็จ:</span>
            <span>{formatThaiDate(deliveryCompletedDate, "short")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
