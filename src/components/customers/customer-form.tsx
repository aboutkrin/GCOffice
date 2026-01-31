"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { customerSchema, type CustomerFormData } from "@/lib/validators";
import { createCustomer, updateCustomer } from "@/actions/customer-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface CustomerFormProps {
  initialData?: any;
}

const LEAD_TYPE_OPTIONS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINE_OA", label: "LINE OA" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "WEBSITE", label: "เว็บไซต์" },
  { value: "REFERRAL", label: "แนะนำ" },
  { value: "OTHER", label: "อื่นๆ" },
];

export function CustomerForm({ initialData }: CustomerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      type: initialData?.type ?? "INDIVIDUAL",
      companyName: initialData?.companyName ?? "",
      customerName: initialData?.customerName ?? "",
      address: initialData?.address ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      leadType: initialData?.leadType ?? undefined,
      notes: initialData?.notes ?? "",
      status: initialData?.status ?? "ACTIVE",
    },
  });

  const customerType = form.watch("type");

  function onSubmit(values: CustomerFormData) {
    startTransition(async () => {
      try {
        if (initialData) {
          await updateCustomer(initialData.id, values);
          toast.success("บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว");
        } else {
          await createCustomer(values);
          toast.success("เพิ่มลูกค้าเรียบร้อยแล้ว");
        }
        router.push("/customers");
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
            <CardTitle>ข้อมูลลูกค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {initialData?.code && (
              <div>
                <label className="text-sm font-medium">รหัสลูกค้า</label>
                <Input value={initialData.code} readOnly disabled className="mt-1" />
              </div>
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทลูกค้า</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกประเภท" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="COMPANY">นิติบุคคล</SelectItem>
                      <SelectItem value="INDIVIDUAL">บุคคลธรรมดา</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customerType === "COMPANY" && (
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อบริษัท</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ชื่อบริษัท"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อลูกค้า</FormLabel>
                  <FormControl>
                    <Input placeholder="ชื่อ-นามสกุล" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ที่อยู่</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ที่อยู่..."
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0xx-xxx-xxxx"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="leadType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทที่มา</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกที่มาของลูกค้า" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAD_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="หมายเหตุเพิ่มเติม..."
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
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

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/customers")}
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
