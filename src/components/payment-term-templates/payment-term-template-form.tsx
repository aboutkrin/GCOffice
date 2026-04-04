"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  paymentTermTemplateSchema,
  type PaymentTermTemplateFormData,
} from "@/lib/validators";
import {
  createPaymentTermTemplate,
  updatePaymentTermTemplate,
} from "@/actions/payment-term-template-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentTermTemplateFormProps {
  initialData?: any;
}

export function PaymentTermTemplateForm({ initialData }: PaymentTermTemplateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialItems = initialData?.items?.length
    ? initialData.items.map((item: any, idx: number) => ({
        sequence: item.sequence ?? idx + 1,
        name: item.name ?? "",
        type: item.type ?? "PERCENTAGE",
        value: item.value ? Number(item.value) : 0,
        note: item.note ?? "",
      }))
    : [{ sequence: 1, name: "", type: "PERCENTAGE" as const, value: 0, note: "" }];

  const [items, setItems] = useState<
    { sequence: number; name: string; type: "PERCENTAGE" | "AMOUNT"; value: number; note: string }[]
  >(initialItems);

  const form = useForm<PaymentTermTemplateFormData>({
    resolver: zodResolver(paymentTermTemplateSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      status: initialData?.status ?? "ACTIVE",
      items: initialItems,
    },
  });

  function addItem() {
    const newItems = [
      ...items,
      {
        sequence: items.length + 1,
        name: "",
        type: "PERCENTAGE" as const,
        value: 0,
        note: "",
      },
    ];
    setItems(newItems);
    form.setValue("items", newItems);
  }

  function removeItem(index: number) {
    const newItems = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sequence: i + 1 }));
    setItems(newItems);
    form.setValue("items", newItems);
  }

  function updateItem(index: number, updates: Partial<(typeof items)[0]>) {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    setItems(newItems);
    form.setValue("items", newItems);
  }

  function onSubmit(values: PaymentTermTemplateFormData) {
    // Ensure items are synced
    values.items = items;

    startTransition(async () => {
      try {
        if (initialData) {
          await updatePaymentTermTemplate(initialData.id, values);
          toast.success("บันทึกเทมเพลตเรียบร้อยแล้ว");
        } else {
          await createPaymentTermTemplate(values);
          toast.success("เพิ่มเทมเพลตเรียบร้อยแล้ว");
        }
        router.push("/payment-terms");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลเทมเพลต</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อเทมเพลต</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น มัดจำ 50% + ชำระคงเหลือ 50%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>สถานะ</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === "ACTIVE"}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? "ACTIVE" : "INACTIVE")
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>งวดชำระเงิน</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                เพิ่มงวด
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-start sm:items-end gap-2 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 w-full sm:w-auto space-y-1">
                  <Label className="text-xs text-muted-foreground">ชื่องวด</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="เช่น งวดที่ 1 - มัดจำ"
                    className="h-9"
                  />
                </div>

                <div className="w-full sm:w-[130px] space-y-1">
                  <Label className="text-xs text-muted-foreground">ประเภท</Label>
                  <Select
                    value={item.type}
                    onValueChange={(val) =>
                      updateItem(index, { type: val as "PERCENTAGE" | "AMOUNT" })
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
                  <DecimalInput
                    value={item.value || ""}
                    onChange={(val) =>
                      updateItem(index, { value: val })
                    }
                    placeholder={item.type === "PERCENTAGE" ? "%" : "฿"}
                    className="h-9"
                  />
                </div>

                <div className="flex-1 w-full sm:w-auto space-y-1">
                  <Label className="text-xs text-muted-foreground">หมายเหตุ</Label>
                  <Input
                    value={item.note}
                    onChange={(e) => updateItem(index, { note: e.target.value })}
                    placeholder="หมายเหตุ"
                    className="h-9"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-destructive hover:text-destructive shrink-0"
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {form.formState.errors.items && (
              <p className="text-sm text-destructive">
                {form.formState.errors.items.message}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/payment-terms")}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            บันทึก
          </Button>
        </div>
      </form>
    </Form>
  );
}
