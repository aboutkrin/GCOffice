"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { productSchema, updateProductSchema, type ProductFormData, type UpdateProductFormData } from "@/lib/validators";
import { createProduct, updateProduct, createProductCategory, saveProductColorVariants } from "@/actions/product-actions";
import { ColorVariantsSection, type ColorVariantItem } from "./color-variants-section";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ProductFormProps {
  initialData?: any;
  categories: any[];
}

export function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categoryList, setCategoryList] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPrefix, setNewCategoryPrefix] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [colorVariants, setColorVariants] = useState<ColorVariantItem[]>(
    initialData?.colorVariants?.map((v: any) => ({
      id: v.id,
      name: v.name,
      colorHex: v.colorHex ?? "",
      imageUrl: v.imageUrl ?? "",
      sortOrder: v.sortOrder ?? 0,
    })) ?? []
  );
  const isEditing = !!initialData;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(isEditing ? updateProductSchema : productSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      categoryId: initialData?.categoryId ?? "",
      basePrice: initialData?.basePrice ? Number(initialData.basePrice) : 0,
      imageUrl: initialData?.imageUrl ?? "",
      status: initialData?.status ?? "ACTIVE",
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const selectedCategory = categoryList.find((c) => c.id === selectedCategoryId);

  function onSubmit(values: ProductFormData | UpdateProductFormData) {
    startTransition(async () => {
      try {
        let productId: string;
        if (initialData) {
          const result = await updateProduct(initialData.id, values);
          productId = result.id;
          // Save color variants
          await saveProductColorVariants(productId, colorVariants);
          toast.success("บันทึกสินค้าเรียบร้อยแล้ว");
        } else {
          const result = await createProduct(values);
          productId = result.id;
          // Save color variants if any
          if (colorVariants.length > 0) {
            await saveProductColorVariants(productId, colorVariants);
          }
          toast.success("เพิ่มสินค้าเรียบร้อยแล้ว");
        }
        router.push("/products");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim() || !newCategoryPrefix.trim()) return;
    try {
      const category = await createProductCategory({
        name: newCategoryName.trim(),
        prefix: newCategoryPrefix.trim().toUpperCase(),
      });
      setCategoryList((prev) => [...prev, category]);
      form.setValue("categoryId", category.id);
      setNewCategoryName("");
      setNewCategoryPrefix("");
      setDialogOpen(false);
      toast.success("เพิ่มหมวดหมู่เรียบร้อยแล้ว");
    } catch (error: any) {
      toast.error(error?.message ?? "เกิดข้อผิดพลาด");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">รหัสสินค้า (SKU)</Label>
                {isEditing ? (
                  <Input value={initialData.sku} disabled />
                ) : (
                  <div className="flex h-9 w-full items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                    {selectedCategory?.prefix
                      ? `${selectedCategory.prefix}-XXXX (สร้างอัตโนมัติ)`
                      : "เลือกหมวดหมู่เพื่อสร้างรหัสอัตโนมัติ"}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อสินค้า</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อสินค้า" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หมวดหมู่</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="เลือกหมวดหมู่" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryList.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.prefix ? `${cat.prefix} - ${cat.name}` : cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="icon">
                            <Plus className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>เพิ่มหมวดหมู่ใหม่</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="mb-2 block">ชื่อหมวดหมู่</Label>
                              <Input
                                placeholder="เช่น ป้ายผ้า"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="mb-2 block">รหัสนำหน้า (Prefix)</Label>
                              <Input
                                placeholder="เช่น TCL"
                                value={newCategoryPrefix}
                                onChange={(e) =>
                                  setNewCategoryPrefix(
                                    e.target.value.toUpperCase().replace(/[^A-Z]/g, "")
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddCategory();
                                  }
                                }}
                              />
                              <p className="text-sm text-muted-foreground mt-1">
                                ใช้สำหรับสร้างรหัสสินค้าอัตโนมัติ เช่น TCL-0001
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={handleAddCategory}
                              className="w-full"
                              disabled={!newCategoryName.trim() || !newCategoryPrefix.trim()}
                            >
                              เพิ่มหมวดหมู่
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาตั้งต้น (บาท)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คำอธิบาย</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="รายละเอียดเพิ่มเติม..."
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
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รูปภาพ</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      bucket="product-images"
                      folder="products"
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

        <ColorVariantsSection
          variants={colorVariants}
          onChange={setColorVariants}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
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
