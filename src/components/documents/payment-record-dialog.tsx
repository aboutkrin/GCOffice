"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { recordInvoicePayment } from "@/actions/document-actions";
import { DOCUMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatThaiDate, toUTCNoon } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import { PaymentMethodChips, type PaymentMethodKind } from "./payment-method-chips";

type PaymentMethod = PaymentMethodKind;
export { PAYMENT_METHOD_ICONS } from "./payment-method-chips";

export interface PaymentRecordTarget {
  id: string;
  documentNumber?: string | null;
  amount: number;
  /** Status to move to: ชำระแล้ว or มัดจำแล้ว. */
  status: "PAID" | "DEPOSITED";
  paymentMethod?: PaymentMethod | null;
  paymentReference?: string | null;
  paymentDate?: string | Date | null;
}

interface PaymentRecordDialogProps {
  target: PaymentRecordTarget | null;
  onClose: () => void;
  /** Called after a successful save (the dialog already refreshed the router). */
  onSaved?: () => void;
}

/**
 * "บันทึกการรับชำระ": how the customer actually paid an invoice. Opened from
 * the invoice list when a status is set to ชำระแล้ว / มัดจำแล้ว, or by clicking
 * the payment line under the status badge to edit it.
 */
export function PaymentRecordDialog({ target, onClose, onSaved }: PaymentRecordDialogProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [date, setDate] = useState<Date>(toUTCNoon(new Date()));
  const [reference, setReference] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setMethod(target.paymentMethod ?? null);
    setDate(target.paymentDate ? new Date(target.paymentDate) : toUTCNoon(new Date()));
    setReference(target.paymentReference ?? "");
  }, [target]);

  const submit = async () => {
    if (!target) return;
    if (!method) {
      toast.error("กรุณาเลือกช่องทางการชำระ");
      return;
    }
    setSaving(true);
    try {
      const result = await recordInvoicePayment(target.id, {
        status: target.status, paymentMethod: method, paymentDate: date, paymentReference: reference || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`บันทึกการชำระ ${PAYMENT_METHOD_LABELS[method]} · ${DOCUMENT_STATUS_LABELS[target.status]}`);
      router.refresh();
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>บันทึกการรับชำระ</DialogTitle>
          <DialogDescription>
            {target?.documentNumber ?? "ร่าง"} · {target ? formatBaht(target.amount) : ""} → {target ? DOCUMENT_STATUS_LABELS[target.status] : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>ช่องทางที่ลูกค้าชำระ <span className="text-destructive">*</span></Label>
            <PaymentMethodChips value={method} onChange={setMethod} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>วันที่ชำระ</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatThaiDate(date, "short")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { if (d) setDate(toUTCNoon(d)); setDateOpen(false); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>เลขอ้างอิง / หมายเหตุ</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="เช่น KBank 16 ต.ค. 14:32"
                maxLength={200}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button type="button" onClick={submit} disabled={saving || !method}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</> : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
