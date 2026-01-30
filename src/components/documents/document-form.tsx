"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Save, FileText, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThaiDate } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";

import { useLineItems, type LineItem } from "@/hooks/use-line-items";
import { usePaymentTerms, type PaymentTerm } from "@/hooks/use-payment-terms";
import { usePricing } from "@/hooks/use-pricing";

import { LineItemTable } from "./line-item-table";
import { PricingSummary } from "./pricing-summary";
import { PaymentTermsSection } from "./payment-terms";
import { DeliveryInfo } from "./delivery-info";

import { createDocument, updateDocument } from "@/actions/document-actions";

// Form schema for top-level fields only (line items & payment terms handled by hooks)
const formSchema = z.object({
  documentDate: z.date(),
  companyId: z.string().min(1, "กรุณาเลือกบริษัท"),
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().default(7),
});

type FormData = z.infer<typeof formSchema>;

interface DocumentFormProps {
  type: "QUOTATION" | "INVOICE";
  initialData?: any;
  companies: any[];
  customers: any[];
  quotations?: any[];
}

export function DocumentForm({
  type,
  initialData,
  companies,
  customers,
  quotations,
}: DocumentFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [discountType, setDiscountType] = useState<
    "PERCENTAGE" | "AMOUNT" | null
  >(initialData?.discountType || null);
  const [discountValue, setDiscountValue] = useState<number>(
    initialData?.discountValue ? Number(initialData.discountValue) : 0
  );
  const [footerNotes, setFooterNotes] = useState<string>(
    initialData?.footerNotes || ""
  );
  const [productionDays, setProductionDays] = useState<string>(
    initialData?.productionDays || ""
  );
  const [deliveryDateStart, setDeliveryDateStart] = useState<
    Date | undefined
  >(initialData?.deliveryDateStart ? new Date(initialData.deliveryDateStart) : undefined);
  const [deliveryDateEnd, setDeliveryDateEnd] = useState<Date | undefined>(
    initialData?.deliveryDateEnd ? new Date(initialData.deliveryDateEnd) : undefined
  );
  const [sourceQuotationId, setSourceQuotationId] = useState<string | undefined>(
    initialData?.sourceQuotationId || undefined
  );

  const isEditing = !!initialData;

  // Initialize line items from existing data
  const initialLineItems: LineItem[] = initialData?.lineItems
    ? initialData.lineItems.map((item: any, idx: number) => ({
        id: item.id || Math.random().toString(36).substr(2, 9),
        sequence: item.sequence || idx + 1,
        productSku: item.productSku || undefined,
        productName: item.productName || "",
        productImage: item.productImage || undefined,
        showImage: item.showImage ?? false,
        details: item.details || undefined,
        quantity: item.quantity || 1,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: Number(item.lineTotal) || 0,
      }))
    : [];

  // Initialize payment terms from existing data
  const initialPaymentTerms: PaymentTerm[] = initialData?.paymentTerms
    ? initialData.paymentTerms.map((term: any, idx: number) => ({
        id: term.id || Math.random().toString(36).substr(2, 9),
        sequence: term.sequence || idx + 1,
        name: term.name || "",
        type: term.type || "PERCENTAGE",
        value: Number(term.value) || 0,
        calculatedAmount: Number(term.calculatedAmount) || 0,
        note: term.note || undefined,
      }))
    : [];

  const { items, setItems, addItem, removeItem, updateItem, setFromProduct, subtotal } =
    useLineItems(initialLineItems);

  const {
    terms,
    setTerms,
    addTerm,
    removeTerm,
    updateTerm,
    recalculate,
    totalAmount: paymentTotalAmount,
  } = usePaymentTerms(initialPaymentTerms);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      documentDate: initialData?.documentDate
        ? new Date(initialData.documentDate)
        : new Date(),
      companyId: initialData?.companyId || "",
      customerId: initialData?.customerId || "",
      vatEnabled: initialData?.vatEnabled ?? true,
      vatRate: initialData?.vatRate ? Number(initialData.vatRate) : 7,
    },
  });

  const vatEnabled = form.watch("vatEnabled");
  const vatRate = form.watch("vatRate");

  const pricing = usePricing({
    subtotal,
    discountType,
    discountValue,
    vatEnabled,
    vatRate,
  });

  // Recalculate payment terms when grand total changes
  useEffect(() => {
    recalculate(pricing.grandTotal);
  }, [pricing.grandTotal, recalculate]);

  // Wrap updateTerm to also recalculate after value/type changes
  const handleUpdateTerm = useCallback(
    (id: string, updates: Partial<PaymentTerm>) => {
      updateTerm(id, updates);
      recalculate(pricing.grandTotal);
    },
    [updateTerm, recalculate, pricing.grandTotal]
  );

  const handleQuotationSelect = (quotationId: string) => {
    const q = quotations?.find((q: any) => q.id === quotationId);
    if (!q) return;

    setSourceQuotationId(quotationId);

    // Pre-fill company and customer
    form.setValue("companyId", q.companyId);
    form.setValue("customerId", q.customerId);

    // Pre-fill VAT settings
    form.setValue("vatEnabled", q.vatEnabled);
    form.setValue("vatRate", Number(q.vatRate));

    // Pre-fill discount
    setDiscountType(q.discountType || null);
    setDiscountValue(q.discountValue ? Number(q.discountValue) : 0);

    // Pre-fill line items
    const newItems = q.lineItems.map((item: any, idx: number) => ({
      id: Math.random().toString(36).substr(2, 9),
      sequence: idx + 1,
      productSku: item.productSku || undefined,
      productName: item.productName || "",
      productImage: item.productImage || undefined,
      showImage: item.showImage ?? false,
      details: item.details || undefined,
      quantity: item.quantity || 1,
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal: Number(item.lineTotal) || 0,
    }));
    setItems(newItems);

    // Pre-fill payment terms
    const newTerms = q.paymentTerms.map((term: any, idx: number) => ({
      id: Math.random().toString(36).substr(2, 9),
      sequence: idx + 1,
      name: term.name || "",
      type: term.type || "PERCENTAGE",
      value: Number(term.value) || 0,
      calculatedAmount: Number(term.calculatedAmount) || 0,
      note: term.note || undefined,
    }));
    setTerms(newTerms);

    // Pre-fill footer notes, production days, delivery dates
    setFooterNotes(q.footerNotes || "");
    setProductionDays(q.productionDays || "");
    setDeliveryDateStart(
      q.deliveryDateStart ? new Date(q.deliveryDateStart) : undefined
    );
    setDeliveryDateEnd(
      q.deliveryDateEnd ? new Date(q.deliveryDateEnd) : undefined
    );
  };

  const assembleData = (formData: FormData) => {
    return {
      type,
      documentDate: formData.documentDate,
      companyId: formData.companyId,
      customerId: formData.customerId,
      sourceQuotationId: type === "INVOICE" ? sourceQuotationId : undefined,
      discountType,
      discountValue,
      vatEnabled: formData.vatEnabled,
      vatRate: formData.vatRate,
      footerNotes: footerNotes || undefined,
      productionDays: productionDays || undefined,
      deliveryDateStart: deliveryDateStart || null,
      deliveryDateEnd: deliveryDateEnd || null,
      lineItems: items.map((item) => ({
        sequence: item.sequence,
        productSku: item.productSku,
        productName: item.productName,
        productImage: item.productImage,
        showImage: item.showImage,
        details: item.details,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      paymentTerms:
        terms.length > 0
          ? terms.map((term) => ({
              sequence: term.sequence,
              name: term.name,
              type: term.type,
              value: term.value,
              calculatedAmount: term.calculatedAmount,
              note: term.note,
            }))
          : undefined,
    };
  };

  const handleSave = async (formData: FormData) => {
    if (type === "INVOICE" && !isEditing && !sourceQuotationId) {
      alert("กรุณาเลือกใบเสนอราคาที่ยืนยันแล้ว");
      return;
    }

    if (items.length === 0) {
      alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    const hasEmptyName = items.some((item) => !item.productName.trim());
    if (hasEmptyName) {
      alert("กรุณาระบุชื่อสินค้าให้ครบทุกรายการ");
      return;
    }

    setSaving(true);
    try {
      const data = assembleData(formData);

      if (isEditing) {
        await updateDocument(initialData.id, data);
      } else {
        await createDocument(data);
      }

      const basePath = type === "QUOTATION" ? "/quotations" : "/invoices";
      router.push(basePath);
      router.refresh();
    } catch (error: any) {
      console.error("บันทึกเอกสารไม่สำเร็จ:", error);
      alert(error?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = DOCUMENT_TYPE_LABELS[type] || type;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        {/* Section 1: Header Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ข้อมูล{typeLabel}
            </CardTitle>
            <CardDescription>
              ระบุข้อมูลบริษัท ลูกค้า และวันที่ของเอกสาร
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Quotation Selector - required for new invoices */}
            {type === "INVOICE" && !isEditing && (
              <div className="mb-4">
                <Label>เลือกจากใบเสนอราคา <span className="text-destructive">*</span></Label>
                {quotations && quotations.length > 0 ? (
                  <Select
                    value={sourceQuotationId}
                    onValueChange={handleQuotationSelect}
                  >
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="เลือกใบเสนอราคาที่ยืนยันแล้ว" />
                    </SelectTrigger>
                    <SelectContent>
                      {quotations.map((q: any) => {
                        const customerName =
                          (q.customerSnapshot as any)?.customerName || "ไม่ระบุ";
                        return (
                          <SelectItem key={q.id} value={q.id}>
                            {q.documentNumber} - {customerName} - {formatBaht(q.grandTotal)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>ไม่มีใบเสนอราคาที่ยืนยันแล้ว กรุณายืนยันใบเสนอราคาก่อนสร้างใบแจ้งหนี้</span>
                  </div>
                )}
                <Separator className="mt-4" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Company Select */}
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บริษัท</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกบริษัท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Select */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>ลูกค้า</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกลูกค้า" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.companyName || customer.customerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Document Date */}
              <FormField
                control={form.control}
                name="documentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่เอกสาร</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? formatThaiDate(field.value, "short")
                              : "เลือกวันที่"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>รายการสินค้า</CardTitle>
            <CardDescription>
              เพิ่มรายการสินค้าที่ต้องการเสนอราคา
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineItemTable
              items={items}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              setFromProduct={setFromProduct}
            />
          </CardContent>
        </Card>

        {/* Section 3: Pricing Summary */}
        <Card>
          <CardHeader>
            <CardTitle>สรุปราคา</CardTitle>
          </CardHeader>
          <CardContent>
            <PricingSummary
              subtotal={subtotal}
              discountType={discountType}
              discountValue={discountValue}
              onDiscountTypeChange={setDiscountType}
              onDiscountValueChange={setDiscountValue}
              discountAmount={pricing.discountAmount}
              vatEnabled={vatEnabled}
              vatRate={vatRate}
              onVatEnabledChange={(val) => form.setValue("vatEnabled", val)}
              vatAmount={pricing.vatAmount}
              grandTotal={pricing.grandTotal}
            />
          </CardContent>
        </Card>

        {/* Section 4: Payment Terms */}
        <Card>
          <CardContent className="pt-6">
            <PaymentTermsSection
              terms={terms}
              addTerm={addTerm}
              removeTerm={removeTerm}
              updateTerm={handleUpdateTerm}
              totalAmount={paymentTotalAmount}
              grandTotal={pricing.grandTotal}
            />
          </CardContent>
        </Card>

        {/* Section 5: Notes & Delivery */}
        <Card>
          <CardHeader>
            <CardTitle>หมายเหตุและการจัดส่ง</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryInfo
              footerNotes={footerNotes}
              onFooterNotesChange={setFooterNotes}
              productionDays={productionDays}
              onProductionDaysChange={setProductionDays}
              deliveryDateStart={deliveryDateStart}
              onDeliveryDateStartChange={(val) => setDeliveryDateStart(val)}
              deliveryDateEnd={deliveryDateEnd}
              onDeliveryDateEndChange={(val) => setDeliveryDateEnd(val)}
            />
          </CardContent>
        </Card>

        {/* Section 6: Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const basePath =
                type === "QUOTATION" ? "/quotations" : "/invoices";
              router.push(basePath);
            }}
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "บันทึกการแก้ไข" : "บันทึก"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
