"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  wooCommerceConfigSchema,
  type WooCommerceConfigFormData,
} from "@/lib/validators";
import {
  saveWooCommerceConfig,
  testWooCommerceConnection,
  deleteWooCommerceConfig,
} from "@/actions/woocommerce-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface WooCommerceConfigFormProps {
  config: {
    id: string;
    storeUrl: string;
    consumerKey: string;
    consumerSecretMasked: string;
    autoSyncEnabled: boolean;
  } | null;
}

export function WooCommerceConfigForm({ config }: WooCommerceConfigFormProps) {
  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const form = useForm<WooCommerceConfigFormData>({
    resolver: zodResolver(wooCommerceConfigSchema) as any,
    defaultValues: {
      storeUrl: config?.storeUrl ?? "",
      consumerKey: config?.consumerKey ?? "",
      consumerSecret: "",
      autoSyncEnabled: config?.autoSyncEnabled ?? false,
    },
  });

  function onSubmit(data: WooCommerceConfigFormData) {
    startSaving(async () => {
      try {
        // If editing and secret is empty, use a placeholder to indicate "keep existing"
        const submitData = { ...data };
        if (config && !submitData.consumerSecret) {
          // Re-validate: secret is required for new configs
          toast.error("กรุณาระบุ Consumer Secret");
          return;
        }

        await saveWooCommerceConfig(submitData);
        toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  function handleTest() {
    if (!config) {
      toast.error("กรุณาบันทึกการตั้งค่าก่อนทดสอบ");
      return;
    }

    startTesting(async () => {
      try {
        await testWooCommerceConnection(config.id);
        toast.success("เชื่อมต่อสำเร็จ");
      } catch {
        toast.error("ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบข้อมูล");
      }
    });
  }

  function handleDelete() {
    if (!config) return;

    startDeleting(async () => {
      try {
        await deleteWooCommerceConfig(config.id);
        toast.success("ลบการตั้งค่าเรียบร้อยแล้ว");
        form.reset({
          storeUrl: "",
          consumerKey: "",
          consumerSecret: "",
          autoSyncEnabled: false,
        });
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  const isPending = isSaving || isTesting || isDeleting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="storeUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://your-store.com"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                URL ของร้านค้า WooCommerce (เช่น https://example.com)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consumerKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consumer Key</FormLabel>
              <FormControl>
                <Input
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consumerSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consumer Secret</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={
                    config
                      ? config.consumerSecretMasked
                      : "cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                  }
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoSyncEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>ซิงค์อัตโนมัติ</FormLabel>
                <FormDescription>
                  ซิงค์สินค้าจาก WooCommerce อัตโนมัติทุกวัน
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            บันทึก
          </Button>
          {config && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isPending}
              >
                {isTesting && <Loader2 className="size-4 animate-spin" />}
                ทดสอบการเชื่อมต่อ
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                ลบ
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
