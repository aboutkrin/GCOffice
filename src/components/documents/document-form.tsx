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
import { formatThaiDate, toUTCNoon } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";

import { useLineItems, type LineItem } from "@/hooks/use-line-items";
import { usePaymentTerms, type PaymentTerm } from "@/hooks/use-payment-terms";
import { usePricing } from "@/hooks/use-pricing";

import { LineItemTable } from "./line-item-table";
import { PricingSummary } from "./pricing-summary";
import { ShippingSection } from "./shipping-section";
import { PaymentTermsSection } from "./payment-terms";
import { DeliveryInfo } from "./delivery-info";

import { createDocument, updateDocument } from "@/actions/document-actions";
import { calculateDeliveryDates, type Holiday } from "@/lib/delivery-date";

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
  type: "QUOTATION" | "INVOICE" | "RECEIPT";
  initialData?: any;
  companies: any[];
  customers: any[];
  quotations?: any[];
  invoices?: any[];
  paymentTermTemplates?: any[];
  holidays?: Holiday[];
}

export function DocumentForm({
  type,
  initialData,
  companies,
  customers,
  quotations,
  invoices,
  paymentTermTemplates,
  holidays = [],
}: DocumentFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [discountType, setDiscountType] = useState<
    "PERCENTAGE" | "AMOUNT" | null
  >(initialData?.discountType || null);
  const [discountValue, setDiscountValue] = useState<number>(
    initialData?.discountValue ? Number(initialData.discountValue) : 0
  );
  const [footerNotes, setFooterNotes] = useState<string>(
    initialData?.footerNotes || ""
  );
  const [productionDaysMin, setProductionDaysMin] = useState<number | null>(
    initialData?.productionDaysMin ?? 10
  );
  const [productionDaysMax, setProductionDaysMax] = useState<number | null>(
    initialData?.productionDaysMax ?? 20
  );
  const [skipWeekends, setSkipWeekends] = useState<boolean>(
    initialData?.skipWeekends ?? true
  );
  const [skipHolidays, setSkipHolidays] = useState<boolean>(
    initialData?.skipHolidays ?? true
  );
  const [shippingCost, setShippingCost] = useState<number>(
    initialData?.shippingCost ? Number(initialData.shippingCost) : 0
  );
  const [productionDaysText, setProductionDaysText] = useState<string>("");
  const [deliveryDateStart, setDeliveryDateStart] = useState<Date | null>(null);
  const [deliveryDateEnd, setDeliveryDateEnd] = useState<Date | null>(null);
  const [deliveryCompletedDate, setDeliveryCompletedDate] = useState<Date | null>(
    initialData?.deliveryCompletedDate ? new Date(initialData.deliveryCompletedDate) : null
  );
  const [sourceQuotationId, setSourceQuotationId] = useState<string | undefined>(
    initialData?.sourceQuotationId || undefined
  );
  const [sourceInvoiceId, setSourceInvoiceId] = useState<string | undefined>(
    initialData?.sourceInvoiceId || undefined
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
        colorVariantName: item.colorVariantName || undefined,
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
        ? toUTCNoon(new Date(initialData.documentDate))
        : toUTCNoon(new Date()),
      companyId: initialData?.companyId || "",
      customerId: initialData?.customerId || "",
      vatEnabled: initialData?.vatEnabled ?? true,
      vatRate: initialData?.vatRate ? Number(initialData.vatRate) : 7,
    },
  });

  const vatEnabled = form.watch("vatEnabled");
  const vatRate = form.watch("vatRate");
  const selectedCompanyId = form.watch("companyId");

  // Pre-fill footerNotes from company defaults when creating a new document
  useEffect(() => {
    if (!isEditing && selectedCompanyId) {
      const selected = companies.find((c: any) => c.id === selectedCompanyId);
      if (selected?.footerNotes) {
        setFooterNotes(selected.footerNotes);
      }
    }
  }, [selectedCompanyId, companies, isEditing]);

  const pricing = usePricing({
    subtotal,
    discountType,
    discountValue,
    vatEnabled,
    vatRate,
    shippingCost,
  });

  // Recalculate payment terms when grand total changes
  useEffect(() => {
    recalculate(pricing.grandTotal);
  }, [pricing.grandTotal, recalculate]);

  // Watch documentDate for delivery date calculation
  const documentDate = form.watch("documentDate");

  // Auto-calculate delivery dates
  useEffect(() => {
    const result = calculateDeliveryDates({
      documentDate,
      daysMin: productionDaysMin,
      daysMax: productionDaysMax,
      skipWeekends,
      skipHolidays,
      holidays,
    });
    setProductionDaysText(result.productionDaysText);
    setDeliveryDateStart(result.deliveryDateStart);
    setDeliveryDateEnd(result.deliveryDateEnd);
  }, [documentDate, productionDaysMin, productionDaysMax, skipWeekends, skipHolidays, holidays]);

  // Wrap updateTerm to also recalculate after value/type changes
  const handleUpdateTerm = useCallback(
    (id: string, updates: Partial<PaymentTerm>) => {
      updateTerm(id, updates);
      recalculate(pricing.grandTotal);
    },
    [updateTerm, recalculate, pricing.grandTotal]
  );

  const handleApplyTemplate = useCallback(
    (templateItems: any[]) => {
      const newTerms: PaymentTerm[] = templateItems.map((item: any, idx: number) => ({
        id: Math.random().toString(36).substr(2, 9),
        sequence: idx + 1,
        name: item.name || "",
        type: item.type || "PERCENTAGE",
        value: Number(item.value) || 0,
        calculatedAmount:
          item.type === "PERCENTAGE"
            ? pricing.grandTotal * (Number(item.value) / 100)
            : Number(item.value),
        note: item.note || undefined,
      }));
      setTerms(newTerms);
    },
    [setTerms, pricing.grandTotal]
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

    // Pre-fill footer notes, shipping, and production day settings
    setFooterNotes(q.footerNotes || "");
    setShippingCost(q.shippingCost ? Number(q.shippingCost) : 0);
    setProductionDaysMin(q.productionDaysMin ?? null);
    setProductionDaysMax(q.productionDaysMax ?? null);
    setSkipWeekends(q.skipWeekends ?? false);
    setSkipHolidays(q.skipHolidays ?? false);
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = invoices?.find((i: any) => i.id === invoiceId);
    if (!inv) return;

    setSourceInvoiceId(invoiceId);

    // Pre-fill company and customer
    form.setValue("companyId", inv.companyId);
    form.setValue("customerId", inv.customerId);

    // Pre-fill VAT settings
    form.setValue("vatEnabled", inv.vatEnabled);
    form.setValue("vatRate", Number(inv.vatRate));

    // Pre-fill discount
    setDiscountType(inv.discountType || null);
    setDiscountValue(inv.discountValue ? Number(inv.discountValue) : 0);

    // Pre-fill line items
    const newItems = inv.lineItems.map((item: any, idx: number) => ({
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
    const newTerms = inv.paymentTerms.map((term: any, idx: number) => ({
      id: Math.random().toString(36).substr(2, 9),
      sequence: idx + 1,
      name: term.name || "",
      type: term.type || "PERCENTAGE",
      value: Number(term.value) || 0,
      calculatedAmount: Number(term.calculatedAmount) || 0,
      note: term.note || undefined,
    }));
    setTerms(newTerms);

    // Pre-fill footer notes, shipping, and production day settings
    setFooterNotes(inv.footerNotes || "");
    setShippingCost(inv.shippingCost ? Number(inv.shippingCost) : 0);
    setProductionDaysMin(inv.productionDaysMin ?? null);
    setProductionDaysMax(inv.productionDaysMax ?? null);
    setSkipWeekends(inv.skipWeekends ?? false);
    setSkipHolidays(inv.skipHolidays ?? false);
  };

  const assembleData = (formData: FormData) => {
    return {
      type,
      documentDate: formData.documentDate,
      companyId: formData.companyId,
      customerId: formData.customerId,
      sourceQuotationId: type === "INVOICE" ? sourceQuotationId : undefined,
      sourceInvoiceId: type === "RECEIPT" ? sourceInvoiceId : undefined,
      discountType,
      discountValue,
      vatEnabled: formData.vatEnabled,
      vatRate: formData.vatRate,
      shippingCost,
      footerNotes: footerNotes || undefined,
      productionDays: productionDaysText || undefined,
      productionDaysMin: productionDaysMin ?? undefined,
      productionDaysMax: productionDaysMax ?? undefined,
      skipWeekends,
      skipHolidays,
      deliveryDateStart: deliveryDateStart || null,
      deliveryDateEnd: deliveryDateEnd || null,
      deliveryCompletedDate: deliveryCompletedDate || null,
      lineItems: items.map((item) => ({
        sequence: item.sequence,
        productSku: item.productSku,
        productName: item.productName,
        productImage: item.productImage,
        colorVariantName: item.colorVariantName,
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

    if (type === "RECEIPT" && !isEditing && !sourceInvoiceId) {
      alert("กรุณาเลือกใบแจ้งหนี้ที่ชำระแล้ว");
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

      let result;
      try {
        result = isEditing
          ? await updateDocument(initialData.id, data)
          : await createDocument(data);
      } catch (actionError: any) {
        // Server action transport error (network, serialization, etc.)
        console.error("Server action failed:", actionError);
        alert(
          `บันทึกไม่สำเร็จ (server action error): ${actionError?.message || "ไม่สามารถเชื่อมต่อ server ได้"}`
        );
        setSaving(false);
        return;
      }

      if (!result.success) {
        console.error("Save failed:", result.error);
        alert(result.error || "เกิดข้อผิดพลาดในการบันทึก");
        setSaving(false);
        return;
      }

      const basePathMap: Record<string, string> = {
        QUOTATION: "/quotations",
        INVOICE: "/invoices",
        RECEIPT: "/receipts",
      };
      const basePath = basePathMap[type] || "/quotations";
      const docDate = formData.documentDate;
      const monthParam = `?year=${docDate.getFullYear()}&month=${docDate.getMonth() + 1}`;
      router.push(basePath + monthParam);
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

            {/* Invoice Selector - required for new receipts */}
            {type === "RECEIPT" && !isEditing && (
              <div className="mb-4">
                <Label>เลือกจากใบแจ้งหนี้ <span className="text-destructive">*</span></Label>
                {invoices && invoices.length > 0 ? (
                  <Select
                    value={sourceInvoiceId}
                    onValueChange={handleInvoiceSelect}
                  >
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue placeholder="เลือกใบแจ้งหนี้ที่ชำระแล้ว" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((inv: any) => {
                        const customerName =
                          (inv.customerSnapshot as any)?.customerName || "ไม่ระบุ";
                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.documentNumber} - {customerName} - {formatBaht(inv.grandTotal)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 mt-1.5 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>ไม่มีใบแจ้งหนี้ที่ชำระแล้ว กรุณาเปลี่ยนสถานะใบแจ้งหนี้เป็น &quot;ชำระแล้ว&quot; ก่อนสร้างใบเสร็จรับเงิน</span>
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
                      onValueChange={(companyId) => {
                        field.onChange(companyId);
                        const selected = companies.find((c) => c.id === companyId);
                        if (selected) {
                          form.setValue("vatEnabled", selected.vatEnabled);
                          form.setValue("vatRate", Number(selected.vatRate));
                        }
                      }}
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
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
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
                          onSelect={(date) => {
                            field.onChange(date ? toUTCNoon(date) : undefined);
                            setDatePopoverOpen(false);
                          }}
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

        {/* Section 3: Shipping */}
        <Card>
          <CardHeader>
            <CardTitle>ค่าจัดส่ง</CardTitle>
            <CardDescription>
              ระบุค่าจัดส่งสินค้า (ถ้ามี)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShippingSection
              shippingCost={shippingCost}
              onShippingCostChange={setShippingCost}
            />
          </CardContent>
        </Card>

        {/* Section 4: Pricing Summary */}
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
              shippingCost={shippingCost}
              grandTotal={pricing.grandTotal}
            />
          </CardContent>
        </Card>

        {/* Section 5: Payment Terms */}
        <Card>
          <CardContent className="pt-6">
            <PaymentTermsSection
              terms={terms}
              removeTerm={removeTerm}
              updateTerm={handleUpdateTerm}
              totalAmount={paymentTotalAmount}
              grandTotal={pricing.grandTotal}
              paymentTermTemplates={paymentTermTemplates}
              onApplyTemplate={handleApplyTemplate}
              productionDaysText={type !== "RECEIPT" ? productionDaysText : undefined}
              deliveryDateStart={type !== "RECEIPT" ? deliveryDateStart : undefined}
              deliveryDateEnd={type !== "RECEIPT" ? deliveryDateEnd : undefined}
            />
          </CardContent>
        </Card>

        {/* Section 6: Notes & Delivery */}
        <Card>
          <CardHeader>
            <CardTitle>หมายเหตุและการจัดส่ง</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryInfo
              documentType={type}
              footerNotes={footerNotes}
              onFooterNotesChange={setFooterNotes}
              productionDaysMin={productionDaysMin}
              onProductionDaysMinChange={setProductionDaysMin}
              productionDaysMax={productionDaysMax}
              onProductionDaysMaxChange={setProductionDaysMax}
              skipWeekends={skipWeekends}
              onSkipWeekendsChange={setSkipWeekends}
              skipHolidays={skipHolidays}
              onSkipHolidaysChange={setSkipHolidays}
              productionDaysText={productionDaysText}
              deliveryDateStart={deliveryDateStart}
              deliveryDateEnd={deliveryDateEnd}
              deliveryCompletedDate={deliveryCompletedDate}
              onDeliveryCompletedDateChange={setDeliveryCompletedDate}
            />
          </CardContent>
        </Card>

        {/* Section 7: Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const basePathMap: Record<string, string> = {
                QUOTATION: "/quotations",
                INVOICE: "/invoices",
                RECEIPT: "/receipts",
              };
              const basePath = basePathMap[type] || "/quotations";
              const docDate = form.getValues("documentDate");
              const monthParam = docDate
                ? `?year=${docDate.getFullYear()}&month=${docDate.getMonth() + 1}`
                : "";
              router.push(basePath + monthParam);
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
