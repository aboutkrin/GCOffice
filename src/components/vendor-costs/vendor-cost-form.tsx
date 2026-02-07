"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";

import {
  vendorCostSchema,
  type VendorCostFormData,
} from "@/lib/validators";
import {
  createVendorCost,
  updateVendorCost,
} from "@/actions/vendor-cost-actions";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  SHIPPING_PROVIDER_LABELS,
  SHIPPING_PROVIDER_OPTIONS,
} from "@/lib/constants";
import { formatBaht } from "@/lib/thai-currency";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ProductPicker } from "@/components/documents/product-picker";

interface VendorCostFormProps {
  initialData?: any;
  invoices: any[];
}

interface CostItem {
  id: string;
  sequence: number;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function VendorCostForm({ initialData, invoices }: VendorCostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialItems: CostItem[] = initialData?.items?.length
    ? initialData.items.map((item: any) => ({
        id: generateId(),
        sequence: item.sequence,
        productName: item.productName,
        productSku: item.productSku ?? "",
        quantity: item.quantity,
        unitCost: Number(item.unitCost),
        lineTotal: Number(item.lineTotal),
      }))
    : [
        {
          id: generateId(),
          sequence: 1,
          productName: "",
          productSku: "",
          quantity: 1,
          unitCost: 0,
          lineTotal: 0,
        },
      ];

  const [items, setItems] = useState<CostItem[]>(initialItems);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        sequence: prev.length + 1,
        productName: "",
        productSku: "",
        quantity: 1,
        unitCost: 0,
        lineTotal: 0,
      },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sequence: index + 1 }))
    );
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<CostItem>) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, ...updates };
          updated.lineTotal = updated.quantity * updated.unitCost;
          return updated;
        })
      );
    },
    []
  );

  const itemsSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const form = useForm<VendorCostFormData>({
    resolver: zodResolver(vendorCostSchema) as any,
    defaultValues: {
      documentId: initialData?.documentId ?? "",
      vendorName: initialData?.vendorName ?? "",
      orderNumber: initialData?.orderNumber ?? "",
      orderDate: initialData?.orderDate
        ? new Date(initialData.orderDate)
        : new Date(),
      exchangeRate: initialData?.exchangeRate
        ? Number(initialData.exchangeRate)
        : undefined,
      shippingCost: initialData?.shippingCost
        ? Number(initialData.shippingCost)
        : 0,
      shippingProvider: initialData?.shippingProvider ?? "UNEED_CARGO",
      shippingPaymentMethod: initialData?.shippingPaymentMethod ?? "TRANSFER",
      shippingPaymentMethodNote: initialData?.shippingPaymentMethodNote ?? "",
      paymentMethod: initialData?.paymentMethod ?? "TRANSFER",
      paymentMethodNote: initialData?.paymentMethodNote ?? "",
      notes: initialData?.notes ?? "",
      items: initialItems,
    },
  });

  const handleInvoiceChange = useCallback(
    (documentId: string) => {
      form.setValue("documentId", documentId);

      if (documentId && documentId !== "none") {
        const invoice = invoices.find((inv: any) => inv.id === documentId);
        if (invoice?.lineItems?.length) {
          const invoiceItems: CostItem[] = invoice.lineItems.map(
            (li: any, index: number) => ({
              id: generateId(),
              sequence: index + 1,
              productName: li.productName,
              productSku: li.productSku ?? "",
              productImage: li.productImage ?? undefined,
              quantity: li.quantity,
              unitCost: Number(li.unitPrice),
              lineTotal: Number(li.lineTotal),
            })
          );
          setItems(invoiceItems);
        }
      }
    },
    [invoices, form]
  );

  // Keep form's items field in sync with state so validation passes
  useEffect(() => {
    form.setValue("items", items.map((item) => ({
      sequence: item.sequence,
      productName: item.productName,
      productSku: item.productSku || undefined,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: item.lineTotal,
    })));
  }, [items, form]);

  const shippingCost = Number(form.watch("shippingCost")) || 0;
  const grandTotal = itemsSubtotal + shippingCost;

  function onSubmit(values: VendorCostFormData) {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          documentId: values.documentId && values.documentId !== "none" ? values.documentId : undefined,
          items: items.map((item) => ({
            sequence: item.sequence,
            productName: item.productName,
            productSku: item.productSku || undefined,
            quantity: item.quantity,
            unitCost: item.unitCost,
            lineTotal: item.lineTotal,
          })),
        };

        if (initialData) {
          await updateVendorCost(initialData.id, payload);
          toast.success("บันทึกต้นทุนใบสั่งซื้อเรียบร้อยแล้ว");
        } else {
          await createVendorCost(payload);
          toast.success("เพิ่มต้นทุนใบสั่งซื้อเรียบร้อยแล้ว");
        }
        router.push("/vendor-costs");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลใบสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="documentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เลขที่บิล (ใบแจ้งหนี้)</FormLabel>
                  <Select
                    onValueChange={handleInvoiceChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกใบแจ้งหนี้ (ไม่บังคับ)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">ไม่ระบุ</SelectItem>
                      {invoices.map((inv: any) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.documentNumber} -{" "}
                          {inv.customer?.companyName ||
                            inv.customer?.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ Vendor / ซัพพลายเออร์</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="เช่น 1688 Shop, Taobao Store..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เลขที่ใบสั่งซื้อ (PO)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="เลขที่ PO หรือ Order ID"
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
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่สั่งซื้อ</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? formatDateForInput(field.value)
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value + "T12:00:00")
                            : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อัตราแลกเปลี่ยน (CNY → THB)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="เช่น 5.05"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>รายการสินค้าที่สั่งซื้อ</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="size-4" />
              เพิ่มรายการ
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="col-span-12 md:col-span-4">
                  <label className="text-sm font-medium">ชื่อสินค้า</label>
                  <div className="flex items-center gap-2">
                    {item.productImage && (
                      <div className="relative shrink-0">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="h-9 w-9 rounded border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(item.id, { productImage: undefined })
                          }
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                    <Input
                      placeholder="ชื่อสินค้า"
                      value={item.productName}
                      onChange={(e) =>
                        updateItem(item.id, { productName: e.target.value })
                      }
                    />
                    <ProductPicker
                      onSelect={(product) =>
                        updateItem(item.id, {
                          productName: product.name,
                          productSku: product.sku,
                          productImage: product.imageUrl,
                          unitCost: Number(product.basePrice),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <label className="text-sm font-medium">SKU</label>
                  <Input
                    placeholder="รหัสสินค้า"
                    value={item.productSku}
                    onChange={(e) =>
                      updateItem(item.id, { productSku: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-6 md:col-span-1">
                  <label className="text-sm font-medium">จำนวน</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="col-span-5 md:col-span-2">
                  <label className="text-sm font-medium">ราคาต่อชิ้น (฿)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitCost || ""}
                    onChange={(e) =>
                      updateItem(item.id, {
                        unitCost: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-5 md:col-span-2">
                  <label className="text-sm font-medium">ยอดรวม</label>
                  <Input
                    readOnly
                    value={formatBaht(item.lineTotal)}
                    className="bg-muted"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Items subtotal */}
            <div className="flex justify-end pt-2 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">ยอดรวมสินค้า: </span>
                <span className="font-medium">{formatBaht(itemsSubtotal)}</span>
              </div>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-destructive">
                กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ
              </p>
            )}
          </CardContent>
        </Card>

        {/* Costs & Payment */}
        <Card>
          <CardHeader>
            <CardTitle>ค่าใช้จ่ายเพิ่มเติมและการชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: ค่าส่งจีน-ไทย + จัดส่งโดย */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shippingCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ค่าส่งจีน-ไทย (฿)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shippingProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จัดส่งโดย</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกผู้ให้บริการจัดส่ง" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SHIPPING_PROVIDER_OPTIONS.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {SHIPPING_PROVIDER_LABELS[provider]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: วิธีการชำระค่าส่ง + รายละเอียด */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shippingPaymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วิธีการชำระค่าส่ง</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกวิธีการชำระค่าส่ง" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
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
                name="shippingPaymentMethodNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รายละเอียดเพิ่มเติม</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="รายละเอียดการชำระค่าส่ง..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: วิธีการชำระสินค้า + รายละเอียด */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วิธีการชำระสินค้า</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกวิธีการชำระสินค้า" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
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
                name="paymentMethodNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รายละเอียดเพิ่มเติม</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="รายละเอียดการชำระสินค้า..."
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

            {/* Grand total */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>ยอดรวมสินค้า</span>
                <span>{formatBaht(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>ค่าส่งจีน-ไทย</span>
                <span>{formatBaht(shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>ยอดต้นทุนรวม</span>
                <span className="text-green-600">{formatBaht(grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/vendor-costs")}
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
