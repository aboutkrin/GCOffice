"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { productCategorySchema, type ProductCategoryFormData } from "@/lib/validators";
import { createProductCategory, updateProductCategory } from "@/actions/product-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryFormProps {
  initialData?: any;
}

export function CategoryForm({ initialData }: CategoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasProducts = initialData?._count?.products > 0;

  const form = useForm<ProductCategoryFormData>({
    resolver: zodResolver(productCategorySchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      prefix: initialData?.prefix ?? "",
    },
  });

  function onSubmit(values: ProductCategoryFormData) {
    startTransition(async () => {
      try {
        if (initialData) {
          await updateProductCategory(initialData.id, values);
          toast.success("บันทึกหมวดหมู่เรียบร้อยแล้ว");
        } else {
          await createProductCategory(values);
          toast.success("เพิ่มหมวดหมู่เรียบร้อยแล้ว");
        }
        router.push("/categories");
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
            <CardTitle>ข้อมูลหมวดหมู่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อหมวดหมู่</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น ป้ายผ้า" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสนำหน้า (Prefix)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น TCL"
                      {...field}
                      disabled={hasProducts}
                      onChange={(e) => {
                        field.onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    ใช้สำหรับสร้างรหัสสินค้าอัตโนมัติ เช่น TCL-0001
                    {hasProducts && " (ไม่สามารถเปลี่ยนได้เนื่องจากมีสินค้าในหมวดหมู่แล้ว)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/categories")}
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
