"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { chinaShipmentSchema, type ChinaShipmentFormData } from "@/lib/validators";
import { createChinaShipment, updateChinaShipment } from "@/actions/china-shipment-actions";
import type { CalendarShipmentItem } from "@/data/team-calendar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePickerButton } from "./date-picker-button";

interface ChinaShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment?: CalendarShipmentItem | null;
  defaultDate?: Date;
  onSaved: () => void;
}

function buildDefaults(
  shipment: CalendarShipmentItem | null | undefined,
  defaultDate: Date | undefined
): ChinaShipmentFormData {
  if (shipment) {
    return {
      title: shipment.title,
      containerNo: shipment.containerNo ?? "",
      supplier: shipment.supplier ?? "",
      shippedDate: new Date(shipment.shippedDate),
      etaDate: shipment.etaDate ? new Date(shipment.etaDate) : null,
      note: shipment.note ?? "",
    };
  }
  return {
    title: "",
    containerNo: "",
    supplier: "",
    shippedDate: defaultDate as Date,
    etaDate: null,
    note: "",
  };
}

export function ChinaShipmentDialog({
  open,
  onOpenChange,
  shipment,
  defaultDate,
  onSaved,
}: ChinaShipmentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ChinaShipmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(chinaShipmentSchema) as any,
    defaultValues: buildDefaults(shipment, defaultDate),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(shipment, defaultDate));
  }, [open, shipment, defaultDate, form]);

  function onSubmit(values: ChinaShipmentFormData) {
    startTransition(async () => {
      try {
        if (shipment) {
          await updateChinaShipment(shipment.id, values);
          toast.success("แก้ไขรายการของจากจีนเรียบร้อยแล้ว");
        } else {
          await createChinaShipment(values);
          toast.success("บันทึกของจากจีนเรียบร้อยแล้ว");
        }
        onOpenChange(false);
        onSaved();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{shipment ? "แก้ไขของจากจีน" : "เพิ่มของจากจีน"}</DialogTitle>
          <DialogDescription>
            บันทึกวันที่จีนส่งของและวันที่คาดว่าจะถึง เพื่อให้ทีมวางแผนงานต่อได้
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อล็อต / รายการสินค้า</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น กระเบื้อง ล็อต ต.ค." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="containerNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เลขตู้ / Tracking</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ผู้ขาย / ชิปปิ้ง</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="shippedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่จีนส่งของ</FormLabel>
                    <DatePickerButton value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="etaDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>คาดว่าถึงไทย</FormLabel>
                    <DatePickerButton
                      value={field.value}
                      onChange={(d) => field.onChange(d ?? null)}
                      placeholder="ยังไม่ทราบ"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
