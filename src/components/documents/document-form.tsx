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
import { Switch } from "@/components/ui/switch";
import { DecimalInput } from "@/components/ui/decimal-input";
import { CalendarIcon, Save, FileText, Loader2, AlertTriangle, Trash2, Plus } from "lucide-react";
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
import { CustomerSelect } from "@/components/customers/customer-select";

import { Input } from "@/components/ui/input";
import { createDocument, updateDocument } from "@/actions/document-actions";
import { calculateDeliveryDates, type Holiday } from "@/lib/delivery-date";

import { RECEIPT_PAYMENT_LABELS, satang, type ReceiptPaymentKind } from "@/lib/receipt-payment";

// Form schema for top-level fields only (line items & payment terms handled by hooks)
const formSchema = z.object({
  documentDate: z.date(),
  companyId: z.string().min(1, "กรุณาเลือกบริษัท"),
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().default(7),
});

type FormData = z.infer<typeof formSchema>;

interface ReceiptInvoiceOption {
  id: string;
  documentNumber: string | null;
  netPayable: number | string;
  grandTotal: number | string;
  receipts: { id: string; netPayable: number | string }[];
  paymentTerms: { name: string; calculatedAmount: number | string }[];
}

interface DepositDeductionRow {
  id: string;
  /** Set when this row links to a deposit invoice already issued in GCOffice; the
   * server always re-reads that document's grandTotal, ignoring `amount` here. */
  depositDocumentId?: string;
  label: string;
  taxInvoiceNumber?: string;
  amount: number;
  checked: boolean;
  depositDate?: string;
  /** true for a manually-added row (label/amount editable); false for a linked
   * deposit invoice candidate (label/amount are read-only, only checked toggles). */
  editable: boolean;
}

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
  const [freeShipping, setFreeShipping] = useState<boolean>(
    initialData ? (initialData.freeShipping ?? false) : false
  );
  const [shippingLocation, setShippingLocation] = useState<string>(
    initialData?.shippingLocation || ""
  );
  const [freeShippingLocation, setFreeShippingLocation] = useState<string>(
    initialData?.freeShippingLocation || ""
  );
  const [pickupAtShowroom, setPickupAtShowroom] = useState<boolean>(
    initialData ? (initialData.pickupAtShowroom ?? false) : false
  );
  const [shippingError, setShippingError] = useState<string>("");
  const [paymentTermsError, setPaymentTermsError] = useState<string>("");
  const [productionDaysText, setProductionDaysText] = useState<string>("");
  const [deliveryDateStart, setDeliveryDateStart] = useState<Date | null>(null);
  const [deliveryDateEnd, setDeliveryDateEnd] = useState<Date | null>(null);
  const [deliveryCompletedDate, setDeliveryCompletedDate] = useState<Date | null>(
    initialData?.deliveryCompletedDate ? new Date(initialData.deliveryCompletedDate) : null
  );
  const [paymentDate] = useState<Date | null>(
    initialData?.paymentDate ? new Date(initialData.paymentDate) : null
  );
  const [sourceQuotationId, setSourceQuotationId] = useState<string | undefined>(
    initialData?.sourceQuotationId || undefined
  );
  const [sourceInvoiceId, setSourceInvoiceId] = useState<string | undefined>(
    initialData?.sourceInvoiceId || undefined
  );
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState<string>(
    initialData?.customInvoiceNumber || ""
  );

  // Legacy invoice fields are retained only when editing existing documents.
  const isDepositInvoice = initialData?.isDepositInvoice ?? false;
  const taxInvoiceNumber = isDepositInvoice ? initialData?.documentNumber || "" : "";
  const depositBasisType = "PERCENTAGE";
  const depositBasisValue = Number(initialData?.depositPercent || 0);

  const managedReceipt = type === "RECEIPT" && (!initialData || !!initialData.receiptPaymentType);
  const [receiptPaymentType, setReceiptPaymentType] = useState<ReceiptPaymentKind>(initialData?.receiptPaymentType || "FULL");
  const [receiptPaymentTouched, setReceiptPaymentTouched] = useState(false);
  const [receiptBasis, setReceiptBasis] = useState<"AMOUNT" | "PERCENTAGE">("AMOUNT");
  const [receiptValue, setReceiptValue] = useState(Number(initialData?.netPayable || 0));
  const [receiptSelectedTermIndex, setReceiptSelectedTermIndex] = useState("");
  const receiptInvoice = (initialData?.sourceInvoice || invoices?.find((invoice) => invoice.id === sourceInvoiceId)) as ReceiptInvoiceOption | undefined;
  const invoiceTotal = Number(receiptInvoice?.netPayable ?? receiptInvoice?.grandTotal ?? 0);
  const previousPayments = (receiptInvoice?.receipts || []).filter((r) => r.id !== initialData?.id)
    .reduce((sum, r) => sum + satang(r.netPayable), 0) / 100;
  const outstanding = (satang(invoiceTotal) - satang(previousPayments)) / 100;
  const receiptAmount = initialData?.receiptPaymentType && initialData.status === "PAID" && !receiptPaymentTouched
    ? Number(initialData.netPayable)
    : receiptPaymentType === "FULL" ? invoiceTotal
    : receiptPaymentType === "BALANCE" ? outstanding
    : satang(receiptBasis === "PERCENTAGE" ? invoiceTotal * receiptValue / 100 : receiptValue) / 100;

  const [depositDeductionRows, setDepositDeductionRows] = useState<DepositDeductionRow[]>(
    initialData?.depositDeductions
      ? initialData.depositDeductions.map((d: any) => ({
          id: d.id || Math.random().toString(36).substr(2, 9),
          depositDocumentId: d.depositDocumentId || undefined,
          label: d.label,
          taxInvoiceNumber: d.taxInvoiceNumber || undefined,
          amount: Number(d.amount) || 0,
          checked: true,
          depositDate: d.depositDate || undefined,
          editable: !d.depositDocumentId,
        }))
      : []
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
        colorVariantSku: item.colorVariantSku || undefined,
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
  const selectedCustomerId = form.watch("customerId");

  // ที่อยู่ลูกค้าจากหัวบิล — ใช้เป็นตัวเลือกด่วนของ "สถานที่จัดส่ง"
  const selectedCustomerAddress =
    customers.find((c) => c.id === selectedCustomerId)?.address || "";



  // Pre-fill footerNotes from company defaults when creating a new document
  useEffect(() => {
    if (!isEditing && selectedCompanyId) {
      const selected = companies.find((c: any) => c.id === selectedCompanyId);
      if (selected?.footerNotes) {
        setFooterNotes(selected.footerNotes);
      }
    }
  }, [selectedCompanyId, companies, isEditing]);

  // A deposit invoice never deducts anything itself (enforced in validators.ts).
  const depositDeduction = isDepositInvoice
    ? 0
    : depositDeductionRows
        .filter((r) => r.checked)
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const pricing = usePricing({
    subtotal,
    discountType,
    discountValue,
    vatEnabled,
    vatRate,
    shippingCost,
    depositDeduction,
  });

  // Recalculate payment terms against the net payable (grand total minus any
  // deposit already invoiced) so the "ยอดรวมงวดชำระไม่ตรงกับยอดสุทธิ" check
  // in payment-terms.tsx compares against what's actually still owed.
  useEffect(() => {
    recalculate(pricing.netPayable);
  }, [pricing.netPayable, recalculate]);

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
      recalculate(pricing.netPayable);
    },
    [updateTerm, recalculate, pricing.netPayable]
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
            ? pricing.netPayable * (Number(item.value) / 100)
            : Number(item.value),
        note: item.note || undefined,
      }));
      setTerms(newTerms);
    },
    [setTerms, pricing.netPayable]
  );

  const applyQuotationLineItemsAndTerms = (q: any) => {
    const newItems = q.lineItems.map((item: any, idx: number) => ({
      id: Math.random().toString(36).substr(2, 9),
      sequence: idx + 1,
      productSku: item.productSku || undefined,
      productName: item.productName || "",
      productImage: item.productImage || undefined,
      colorVariantName: item.colorVariantName || undefined,
      colorVariantSku: item.colorVariantSku || undefined,
      showImage: item.showImage ?? false,
      details: item.details || undefined,
      quantity: item.quantity || 1,
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal: Number(item.lineTotal) || 0,
    }));
    setItems(newItems);

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
  };

  // ── Deduct-deposit-on-final-invoice row management ───────────────────────
  const toggleDeductionRow = (id: string) => {
    setDepositDeductionRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r))
    );
  };

  const addManualDeductionRow = () => {
    setDepositDeductionRows((rows) => [
      ...rows,
      {
        id: Math.random().toString(36).substr(2, 9),
        label: "",
        amount: 0,
        checked: true,
        editable: true,
      },
    ]);
  };

  const updateManualDeductionRow = (id: string, updates: Partial<DepositDeductionRow>) => {
    setDepositDeductionRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const removeDeductionRow = (id: string) => {
    setDepositDeductionRows((rows) => rows.filter((r) => r.id !== id));
  };

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

    applyQuotationLineItemsAndTerms(q);

    // Pre-fill footer notes, shipping, and production day settings
    setFooterNotes(q.footerNotes || "");
    if (!isDepositInvoice) {
      setShippingCost(q.shippingCost ? Number(q.shippingCost) : 0);
      setFreeShipping(q.freeShipping ?? false);
      setShippingLocation(q.shippingLocation || "");
      setFreeShippingLocation(q.freeShippingLocation || "");
      setPickupAtShowroom(q.pickupAtShowroom ?? false);
    }
    setProductionDaysMin(q.productionDaysMin ?? null);
    setProductionDaysMax(q.productionDaysMax ?? null);
    setSkipWeekends(q.skipWeekends ?? false);
    setSkipHolidays(q.skipHolidays ?? false);


  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = invoices?.find((i: any) => i.id === invoiceId);
    if (!inv) return;

    setSourceInvoiceId(invoiceId);
    const alreadyPaid = (inv.receipts as ReceiptInvoiceOption["receipts"] || []).reduce((sum, r) => sum + satang(r.netPayable), 0);
    setReceiptPaymentType(alreadyPaid > 0 ? "BALANCE" : "FULL");
    setReceiptBasis("AMOUNT");
    setReceiptValue(Number(inv.paymentTerms?.[0]?.calculatedAmount || 0));

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
      colorVariantName: item.colorVariantName || undefined,
      colorVariantSku: item.colorVariantSku || undefined,
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
    setFreeShipping(inv.freeShipping ?? false);
    setShippingLocation(inv.shippingLocation || "");
    setFreeShippingLocation(inv.freeShippingLocation || "");
    setPickupAtShowroom(inv.pickupAtShowroom ?? false);
    setProductionDaysMin(inv.productionDaysMin ?? null);
    setProductionDaysMax(inv.productionDaysMax ?? null);
    setSkipWeekends(inv.skipWeekends ?? false);
    setSkipHolidays(inv.skipHolidays ?? false);
  };

  const assembleData = (formData: FormData) => {
    const checkedDeductions = !isDepositInvoice
      ? depositDeductionRows.filter(
          (r) => r.checked && (r.depositDocumentId || (r.label.trim() && r.amount > 0))
        )
      : [];

    return {
      type,
      documentDate: formData.documentDate,
      companyId: formData.companyId,
      customerId: formData.customerId,
      customInvoiceNumber: type === "RECEIPT" ? customInvoiceNumber || undefined : undefined,
      sourceQuotationId: type === "INVOICE" ? sourceQuotationId : undefined,
      sourceInvoiceId: type === "RECEIPT" ? sourceInvoiceId : undefined,
      isDepositInvoice: type === "INVOICE" ? isDepositInvoice : undefined,
      taxInvoiceNumber: isDepositInvoice ? taxInvoiceNumber.trim() || undefined : undefined,
      depositPercent: isDepositInvoice && depositBasisType === "PERCENTAGE" ? depositBasisValue : undefined,
      receiptPaymentType: managedReceipt ? receiptPaymentType : undefined,
      receiptAmount: managedReceipt ? receiptAmount : undefined,
      discountType,
      discountValue,
      vatEnabled: formData.vatEnabled,
      vatRate: formData.vatRate,
      shippingCost: isDepositInvoice || pickupAtShowroom || freeShipping ? 0 : shippingCost,
      shippingLocation: !isDepositInvoice && !pickupAtShowroom && !freeShipping && shippingCost > 0 ? shippingLocation || undefined : undefined,
      freeShipping: !isDepositInvoice && !pickupAtShowroom && freeShipping,
      freeShippingLocation: !isDepositInvoice && !pickupAtShowroom && freeShipping ? freeShippingLocation || undefined : undefined,
      pickupAtShowroom: !isDepositInvoice && pickupAtShowroom,
      footerNotes: footerNotes || undefined,
      productionDays: productionDaysText || undefined,
      productionDaysMin: productionDaysMin ?? undefined,
      productionDaysMax: productionDaysMax ?? undefined,
      skipWeekends,
      skipHolidays,
      deliveryDateStart: deliveryDateStart || null,
      deliveryDateEnd: deliveryDateEnd || null,
      deliveryCompletedDate: deliveryCompletedDate || null,
      paymentDate: paymentDate || null,
      lineItems: items.map((item) => ({
        sequence: item.sequence,
        productSku: item.productSku,
        productName: item.productName,
        productImage: item.productImage,
        colorVariantName: item.colorVariantName,
        colorVariantSku: item.colorVariantSku,
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
      depositDeductions:
        checkedDeductions.length > 0
          ? checkedDeductions.map((r, idx) => ({
              sequence: idx + 1,
              depositDocumentId: r.depositDocumentId,
              label: r.label,
              taxInvoiceNumber: r.taxInvoiceNumber,
              amount: r.amount,
              depositDate: r.depositDate ? new Date(r.depositDate) : undefined,
            }))
          : undefined,
    };
  };

  const handleSave = async (formData: FormData, asDraft = false) => {
    if (type === "INVOICE" && !isEditing && !sourceQuotationId) {
      alert("กรุณาเลือกใบเสนอราคาที่ยืนยันแล้ว");
      return;
    }

    if (type === "RECEIPT" && !isEditing && !sourceInvoiceId) {
      alert("กรุณาเลือกใบแจ้งหนี้");
      return;
    }

    if (isDepositInvoice && !taxInvoiceNumber.trim()) {
      alert("กรุณาระบุเลขที่ใบกำกับภาษี");
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

    // Validate shipping — a deposit invoice never carries shipping.
    if (!managedReceipt && !isDepositInvoice && !pickupAtShowroom && !freeShipping && shippingCost <= 0) {
      setShippingError("กรุณาระบุค่าจัดส่ง หรือเลือก จัดส่งฟรี หรือ รับเองที่โชว์รูม");
      const el = document.getElementById("shipping-section");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setShippingError("");

    // Validate payment terms
    if (!managedReceipt && terms.length === 0) {
      setPaymentTermsError("กรุณาเพิ่มเงื่อนไขการชำระเงินอย่างน้อย 1 งวด");
      const el = document.getElementById("payment-terms-section");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPaymentTermsError("");

    if (managedReceipt && (!Number.isFinite(receiptAmount) || receiptAmount <= 0 || satang(receiptAmount) > satang(outstanding))) {
      alert("ยอดรับชำระต้องมากกว่า 0 และไม่เกินยอดคงเหลือ");
      return;
    }
    setSaving(true);
    try {
      const data = assembleData(formData);

      let result;
      try {
        result = isEditing
          ? await updateDocument(initialData.id, data)
          : await createDocument(data, { asDraft });
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
      <form onSubmit={form.handleSubmit((data) => handleSave(data))} className="space-y-6">
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

            {/* Deduct deposit(s) already invoiced — final invoice only (new or edit) */}
            {type === "INVOICE" && !isDepositInvoice && isEditing && Number(initialData?.depositDeduction) > 0 && (
              <div className="mb-4">
                <div className="rounded-lg border p-3 space-y-3">
                  <Label className="text-sm font-medium">หักเงินมัดจำที่ชำระแล้ว</Label>
                  <div className="space-y-2">
                    {depositDeductionRows.map((row) =>
                      row.editable ? (
                        <div
                          key={row.id}
                          className="flex flex-col sm:flex-row items-start sm:items-end gap-2 p-2 rounded-md border bg-muted/30"
                        >
                          <div className="flex-1 w-full space-y-1">
                            <Label className="text-xs text-muted-foreground">รายการหัก</Label>
                            <Input
                              value={row.label}
                              onChange={(e) =>
                                updateManualDeductionRow(row.id, { label: e.target.value })
                              }
                              placeholder="เช่น เงินมัดจำตามใบกำกับภาษี A6809-001"
                              className="h-9"
                            />
                          </div>
                          <div className="w-full sm:w-[160px] space-y-1">
                            <Label className="text-xs text-muted-foreground">จำนวนเงิน (฿)</Label>
                            <DecimalInput
                              value={row.amount || ""}
                              onChange={(val) => updateManualDeductionRow(row.id, { amount: val })}
                              placeholder="กรอกจำนวนเงิน"
                              className="h-9"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeductionRow(row.id)}
                            className="text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          key={row.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Switch
                              checked={row.checked}
                              onCheckedChange={() => toggleDeductionRow(row.id)}
                            />
                            <div className="min-w-0">
                              <div className="text-sm truncate">{row.label}</div>
                              {row.depositDate && (
                                <div className="text-xs text-muted-foreground">
                                  {formatThaiDate(new Date(row.depositDate), "short")}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-medium shrink-0">
                            {formatBaht(row.amount)}
                          </div>
                        </div>
                      )
                    )}
                    {depositDeductionRows.length === 0 && (
                      <p className="text-sm text-muted-foreground">ไม่มีเงินมัดจำที่ต้องหัก</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addManualDeductionRow}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มรายการหักด้วยตนเอง
                  </Button>
                </div>
                <Separator className="mt-4" />
              </div>
            )}

            {/* Deposit invoice indicator — edit mode. isDepositInvoice / the
                tax-invoice number are immutable after creation. */}
            {type === "INVOICE" && isEditing && initialData?.isDepositInvoice && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  เอกสารนี้เป็นใบแจ้งหนี้มัดจำ เลขที่ใบกำกับภาษี: {initialData.documentNumber ?? "ร่าง"}
                </span>
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
                      <SelectValue placeholder="เลือกใบแจ้งหนี้ที่ต้องการรับชำระ" />
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
                    <span>ไม่มีใบแจ้งหนี้ที่มียอดคงเหลือสำหรับรับชำระ</span>
                  </div>
                )}
                <Separator className="mt-4" />
              </div>
            )}

            {managedReceipt && receiptInvoice && (
              <div className="mb-4 space-y-4 rounded-lg border p-4">
                <p className="font-medium">รับชำระตามใบแจ้งหนี้ {receiptInvoice.documentNumber}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>ยอดใบแจ้งหนี้ <strong>{formatBaht(invoiceTotal)}</strong></div>
                  <div>รับชำระแล้ว <strong>{formatBaht(previousPayments)}</strong></div>
                  <div>ยอดคงเหลือ <strong>{formatBaht(outstanding)}</strong></div>
                </div>
                <div className="space-y-2">
                  <Label>ประเภทการรับชำระ</Label>
                  <Select value={receiptPaymentType} onValueChange={(value) => { setReceiptPaymentTouched(true); setReceiptPaymentType(value as ReceiptPaymentKind); }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL" disabled={previousPayments > 0}>เต็มจำนวน</SelectItem>
                      <SelectItem value="DEPOSIT">มัดจำ</SelectItem>
                      <SelectItem value="BALANCE" disabled={previousPayments <= 0}>ยอดคงเหลือ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {receiptPaymentType === "DEPOSIT" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>เลือกงวดชำระ (หรือระบุเอง)</Label>
                      <Select value={receiptSelectedTermIndex} onValueChange={(index) => {
                        setReceiptPaymentTouched(true);
                        setReceiptSelectedTermIndex(index);
                        setReceiptBasis("AMOUNT");
                        setReceiptValue(Number(receiptInvoice.paymentTerms[Number(index)].calculatedAmount));
                      }}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="เลือกงวดชำระ" /></SelectTrigger>
                        <SelectContent>
                          {(receiptInvoice.paymentTerms || []).map((term, index) => (
                            <SelectItem key={index} value={String(index)}>{term.name} — {formatBaht(Number(term.calculatedAmount))}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>ระบุยอดเป็น</Label>
                      <Select value={receiptBasis} onValueChange={(value) => {
                        setReceiptPaymentTouched(true);
                        setReceiptBasis(value as "AMOUNT" | "PERCENTAGE");
                        setReceiptValue(value === "PERCENTAGE" ? (invoiceTotal ? receiptAmount / invoiceTotal * 100 : 0) : receiptAmount);
                      }}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="AMOUNT">จำนวนเงิน (฿)</SelectItem><SelectItem value="PERCENTAGE">เปอร์เซ็นต์ของยอดใบแจ้งหนี้</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{receiptBasis === "PERCENTAGE" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงินรวมภาษี (฿)"}</Label>
                      <DecimalInput value={receiptValue || ""} onChange={(value) => { setReceiptPaymentTouched(true); setReceiptValue(value); }} />
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap justify-between gap-3 rounded-md bg-muted p-3">
                  <strong>รับชำระ{RECEIPT_PAYMENT_LABELS[receiptPaymentType]}ครั้งนี้ {formatBaht(receiptAmount)}</strong>
                  <span>คงเหลือหลังรับชำระ {formatBaht((satang(outstanding) - satang(receiptAmount)) / 100)}</span>
                </div>
                <p className="text-xs text-muted-foreground">ยอดรับชำระรวมภาษีตามใบแจ้งหนี้แล้ว ใบเสร็จร่างยังไม่หักยอดคงเหลือ</p>
              </div>
            )}

            {/* Custom Invoice Number - RECEIPT only */}
            {type === "RECEIPT" && (
              <div className="mb-4">
                <Label>เลขที่ใบเสร็จ (กำหนดเอง)</Label>
                <Input
                  className="mt-1.5 max-w-xs"
                  value={customInvoiceNumber}
                  onChange={(e) => setCustomInvoiceNumber(e.target.value)}
                  placeholder="เช่น A 6903-001"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ถ้าไม่ระบุ ระบบจะใช้เลขที่เอกสารอัตโนมัติ
                </p>
              </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Company Select */}
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บริษัท <span className="text-destructive">*</span></FormLabel>
                    <Select
                      disabled={managedReceipt}
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
                    <FormLabel>ลูกค้า <span className="text-destructive">*</span></FormLabel>
                    <fieldset disabled={managedReceipt}>
                    <CustomerSelect
                      customers={customers}
                      value={field.value}
                      onSelect={(customer) => field.onChange(customer.id)}
                      placeholder="เลือกลูกค้า"
                    />
                    </fieldset>
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

        {!managedReceipt && (<>
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
        <Card id="shipping-section">
          <CardHeader>
            <CardTitle>ค่าจัดส่ง</CardTitle>
            <CardDescription>
              ระบุค่าจัดส่งสินค้า (ถ้ามี)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShippingSection
              shippingCost={shippingCost}
              onShippingCostChange={(val) => {
                setShippingCost(val);
                if (val > 0) setShippingError("");
              }}
              shippingLocation={shippingLocation}
              onShippingLocationChange={setShippingLocation}
              freeShipping={freeShipping}
              onFreeShippingChange={(val) => {
                setFreeShipping(val);
                if (val) setShippingError("");
              }}
              freeShippingLocation={freeShippingLocation}
              onFreeShippingLocationChange={setFreeShippingLocation}
              pickupAtShowroom={pickupAtShowroom}
              onPickupAtShowroomChange={(val) => {
                setPickupAtShowroom(val);
                if (val) setShippingError("");
              }}
              customerAddress={selectedCustomerAddress}
              error={shippingError}
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
              depositDeduction={depositDeduction}
              netPayable={pricing.netPayable}
            />
          </CardContent>
        </Card>

        {/* Section 5: Payment Terms */}
        <Card id="payment-terms-section">
          <CardContent className="pt-6">
            <PaymentTermsSection
              terms={terms}
              addTerm={() => {
                addTerm();
                setPaymentTermsError("");
              }}
              removeTerm={removeTerm}
              updateTerm={handleUpdateTerm}
              totalAmount={paymentTotalAmount}
              grandTotal={pricing.netPayable}
              paymentTermTemplates={paymentTermTemplates}
              onApplyTemplate={(tpl) => {
                handleApplyTemplate(tpl);
                setPaymentTermsError("");
              }}
              deliveryCompletedDate={deliveryCompletedDate}
              documentType={type}
              error={paymentTermsError}
            />
          </CardContent>
        </Card>

        </>)}

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
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={form.handleSubmit((data) => handleSave(data, true))}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  บันทึกร่าง
                </>
              )}
            </Button>
          )}
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
