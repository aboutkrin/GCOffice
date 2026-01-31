"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { companySchema, type CompanyFormData } from "@/lib/validators";
import { createCompany, updateCompany } from "@/actions/company-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CompanyFormProps {
  initialData?: any;
}

export function CompanyForm({ initialData }: CompanyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      address: initialData?.address ?? "",
      taxId: initialData?.taxId ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      facebook: initialData?.facebook ?? "",
      lineOa: initialData?.lineOa ?? "",
      tiktok: initialData?.tiktok ?? "",
      logoUrl: initialData?.logoUrl ?? "",
      bankName: initialData?.bankName ?? "",
      accountName: initialData?.accountName ?? "",
      accountNumber: initialData?.accountNumber ?? "",
      bankLogoUrl: initialData?.bankLogoUrl ?? "",
      promptpayQrUrl: initialData?.promptpayQrUrl ?? "",
      vatEnabled: initialData?.vatEnabled ?? true,
      vatRate: initialData?.vatRate ? Number(initialData.vatRate) : 7,
      footerNotes: initialData?.footerNotes ?? "",
      status: initialData?.status ?? "ACTIVE",
    },
  });

  function onSubmit(values: CompanyFormData) {
    startTransition(async () => {
      try {
        if (initialData) {
          await updateCompany(initialData.id, values);
          toast.success("บันทึกข้อมูลบริษัทเรียบร้อยแล้ว");
        } else {
          await createCompany(values);
          toast.success("เพิ่มบริษัทเรียบร้อยแล้ว");
        }
        router.push("/companies");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ข้อมูลบริษัท */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลบริษัท</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อบริษัท</FormLabel>
                  <FormControl>
                    <Input placeholder="ชื่อบริษัท" {...field} />
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
                      placeholder="ที่อยู่บริษัท..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เลขประจำตัวผู้เสียภาษี</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เลขประจำตัวผู้เสียภาษี"
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
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>โลโก้</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      bucket="company-logos"
                      folder="logos"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ช่องทางติดต่อ */}
        <Card>
          <CardHeader>
            <CardTitle>ช่องทางติดต่อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        placeholder="email@company.com"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Facebook page"
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
                name="lineOa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LINE OA</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@line-oa"
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
                name="tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@tiktok"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ข้อมูลชำระเงิน */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ธนาคาร</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ชื่อธนาคาร"
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
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อบัญชี</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ชื่อบัญชี"
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
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เลขที่บัญชี</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="xxx-x-xxxxx-x"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankLogoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>โลโก้ธนาคาร</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        bucket="company-logos"
                        folder="bank-logos"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promptpayQrUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QR Code พร้อมเพย์</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        bucket="company-logos"
                        folder="promptpay-qr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ตั้งค่าเริ่มต้น */}
        <Card>
          <CardHeader>
            <CardTitle>ตั้งค่าเริ่มต้น</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="vatEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>ภาษีมูลค่าเพิ่ม (VAT)</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vatRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>อัตราภาษี (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="7"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="footerNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ข้อความท้ายเอกสาร</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ข้อความที่จะแสดงท้ายเอกสาร..."
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
            onClick={() => router.push("/companies")}
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
