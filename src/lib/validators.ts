import { z } from "zod";

export const productCategorySchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อหมวดหมู่"),
  prefix: z.string()
    .min(1, "กรุณาระบุรหัสนำหน้า")
    .max(10, "รหัสนำหน้าต้องไม่เกิน 10 ตัวอักษร")
    .regex(/^[A-Z]+$/, "รหัสนำหน้าต้องเป็นตัวอักษรภาษาอังกฤษตัวพิมพ์ใหญ่เท่านั้น"),
});

export const productSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อสินค้า"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  basePrice: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
  imageUrl: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อสินค้า"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  basePrice: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
  imageUrl: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const customerSchema = z.object({
  type: z.enum(["COMPANY", "INDIVIDUAL"]),
  companyName: z.string().optional(),
  customerName: z.string().min(1, "กรุณาระบุชื่อลูกค้า"),
  contactPerson: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  leadType: z.enum(["FACEBOOK", "INSTAGRAM", "LINE_OA", "TIKTOK", "WEBSITE", "REFERRAL", "OTHER"]).optional(),
  leadName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const companySchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อบริษัท"),
  address: z.string().min(1, "กรุณาระบุที่อยู่"),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  lineOa: z.string().optional(),
  tiktok: z.string().optional(),
  logoUrl: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankLogoUrl: z.string().optional(),
  promptpayQrUrl: z.string().optional(),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().default(7),
  footerNotes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const lineItemSchema = z.object({
  sequence: z.number(),
  productSku: z.string().optional(),
  productName: z.string().min(1, "กรุณาระบุชื่อสินค้า"),
  productImage: z.string().optional(),
  colorVariantName: z.string().optional(),
  showImage: z.boolean().default(true),
  details: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
  unitPrice: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
  lineTotal: z.coerce.number(),
});

export const paymentTermSchema = z.object({
  sequence: z.number(),
  name: z.string().min(1, "กรุณาระบุชื่อเงื่อนไข"),
  type: z.enum(["PERCENTAGE", "AMOUNT"]),
  value: z.coerce.number().min(0),
  calculatedAmount: z.coerce.number(),
  note: z.string().optional(),
});

export const holidaySchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อวันหยุด"),
  date: z.coerce.date({ error: "กรุณาเลือกวันที่" }),
  isRecurring: z.boolean().default(false),
});

export const holidayRangeSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อวันหยุด"),
  startDate: z.coerce.date({ error: "กรุณาเลือกวันที่เริ่มต้น" }),
  endDate: z.coerce.date({ error: "กรุณาเลือกวันที่สิ้นสุด" }),
  isRecurring: z.boolean().default(false),
}).refine(
  (data) => data.endDate >= data.startDate,
  { message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น", path: ["endDate"] }
);

export const documentSchema = z.object({
  type: z.enum(["QUOTATION", "INVOICE", "RECEIPT"]),
  documentDate: z.coerce.date(),
  companyId: z.string().min(1, "กรุณาเลือกบริษัท"),
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  sourceQuotationId: z.string().optional(),
  sourceInvoiceId: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).optional().nullable(),
  discountValue: z.coerce.number().optional(),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().default(7),
  shippingCost: z.coerce.number().min(0, "ค่าจัดส่งต้องไม่ติดลบ").default(0),
  footerNotes: z.string().optional(),
  productionDays: z.string().optional(),
  productionDaysMin: z.coerce.number().int().min(1, "ต้องมากกว่า 0").optional().nullable(),
  productionDaysMax: z.coerce.number().int().min(1, "ต้องมากกว่า 0").optional().nullable(),
  skipWeekends: z.boolean().default(true),
  skipHolidays: z.boolean().default(true),
  deliveryDateStart: z.coerce.date().optional().nullable(),
  deliveryDateEnd: z.coerce.date().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"),
  paymentTerms: z.array(paymentTermSchema).optional(),
}).refine(
  (data) => data.type !== "INVOICE" || (data.sourceQuotationId && data.sourceQuotationId.length > 0),
  { message: "กรุณาเลือกใบเสนอราคา", path: ["sourceQuotationId"] }
).refine(
  (data) => data.type !== "RECEIPT" || (data.sourceInvoiceId && data.sourceInvoiceId.length > 0),
  { message: "กรุณาเลือกใบแจ้งหนี้", path: ["sourceInvoiceId"] }
).refine(
  (data) => {
    if (data.productionDaysMin != null && data.productionDaysMax != null) {
      return data.productionDaysMax >= data.productionDaysMin;
    }
    return true;
  },
  { message: "จำนวนวันสูงสุดต้องมากกว่าหรือเท่ากับจำนวนวันต่ำสุด", path: ["productionDaysMax"] }
);

export const paymentTermTemplateItemSchema = z.object({
  sequence: z.number(),
  name: z.string().min(1, "กรุณาระบุชื่องวด"),
  type: z.enum(["PERCENTAGE", "AMOUNT"]),
  value: z.coerce.number().min(0, "ค่าต้องไม่ติดลบ"),
  note: z.string().optional(),
});

export const paymentTermTemplateSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อเทมเพลต"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  items: z.array(paymentTermTemplateItemSchema).min(1, "กรุณาเพิ่มงวดชำระอย่างน้อย 1 รายการ"),
});

export type ProductCategoryFormData = z.infer<typeof productCategorySchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
export type DocumentFormData = z.infer<typeof documentSchema>;
export type LineItemFormData = z.infer<typeof lineItemSchema>;
export type PaymentTermFormData = z.infer<typeof paymentTermSchema>;
export type HolidayFormData = z.infer<typeof holidaySchema>;
export type HolidayRangeFormData = z.infer<typeof holidayRangeSchema>;
export const wooCommerceConfigSchema = z.object({
  storeUrl: z.string().url("กรุณาระบุ URL ที่ถูกต้อง").min(1, "กรุณาระบุ URL ร้านค้า"),
  consumerKey: z.string().min(1, "กรุณาระบุ Consumer Key"),
  consumerSecret: z.string().min(1, "กรุณาระบุ Consumer Secret"),
  autoSyncEnabled: z.boolean().default(false),
});

export const profileSchema = z.object({
  firstName: z.string().min(1, "กรุณาระบุชื่อ"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล"),
  signatureUrl: z.string().optional(),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อหมวดหมู่"),
});

export const expenseSchema = z.object({
  name: z.string().min(1, "กรุณาระบุรายการค่าใช้จ่าย"),
  amount: z.coerce.number().min(0, "จำนวนเงินต้องไม่ติดลบ"),
  expenseDate: z.coerce.date({ error: "กรุณาเลือกวันที่" }),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CREDIT_CARD", "PROMPTPAY", "OTHER"], {
    error: "กรุณาเลือกวิธีการชำระ",
  }).default("TRANSFER"),
  notes: z.string().optional(),
});

export type PaymentTermTemplateItemFormData = z.infer<typeof paymentTermTemplateItemSchema>;
export type PaymentTermTemplateFormData = z.infer<typeof paymentTermTemplateSchema>;
export type WooCommerceConfigFormData = z.infer<typeof wooCommerceConfigSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ExpenseCategoryFormData = z.infer<typeof expenseCategorySchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const vendorCostItemSchema = z.object({
  sequence: z.number(),
  productName: z.string().min(1, "กรุณาระบุชื่อสินค้า"),
  productSku: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
  unitCostCny: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ").optional().nullable(),
  unitCostRate: z.coerce.number().min(0, "เรทต้องไม่ติดลบ").optional().nullable(),
  unitCost: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
  lineTotal: z.coerce.number(),
});

export const vendorCostSchema = z.object({
  documentId: z.string().optional(),
  vendorName: z.string().min(1, "กรุณาระบุชื่อ Vendor"),
  orderNumber: z.string().optional(),
  orderDate: z.coerce.date({ error: "กรุณาเลือกวันที่สั่งซื้อ" }),
  exchangeRate: z.coerce.number().min(0, "อัตราแลกเปลี่ยนต้องไม่ติดลบ").optional().nullable(),
  shippingCost: z.coerce.number().min(0, "ค่าส่งต้องไม่ติดลบ").default(0),
  shippingProvider: z.enum(["UNEED_CARGO", "OTHER"], {
    error: "กรุณาเลือกผู้ให้บริการจัดส่ง",
  }).default("UNEED_CARGO"),
  shippingPaymentMethod: z.enum(["CASH", "TRANSFER", "CREDIT_CARD", "PROMPTPAY", "OTHER"], {
    error: "กรุณาเลือกวิธีการชำระค่าส่ง",
  }).default("TRANSFER"),
  shippingPaymentMethodNote: z.string().optional(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CREDIT_CARD", "PROMPTPAY", "OTHER"], {
    error: "กรุณาเลือกวิธีการชำระสินค้า",
  }).default("TRANSFER"),
  paymentMethodNote: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(vendorCostItemSchema).min(1, "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"),
});

export type VendorCostItemFormData = z.infer<typeof vendorCostItemSchema>;
export type VendorCostFormData = z.infer<typeof vendorCostSchema>;

export const colorVariantSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อสี"),
  colorHex: z.string().optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const colorVariantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "กรุณาระบุชื่อสี"),
  colorHex: z.string().optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "กรุณาเลือกสินค้า"),
  colorVariantId: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

export const stockThresholdSchema = z.object({
  productId: z.string().min(1, "กรุณาเลือกสินค้า"),
  colorVariantId: z.string().optional(),
  lowStockThreshold: z.coerce.number().int().min(0, "จำนวนต้องไม่ติดลบ"),
});

export type ColorVariantFormData = z.infer<typeof colorVariantSchema>;
export type ColorVariantInputFormData = z.infer<typeof colorVariantInputSchema>;
export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
export type StockThresholdFormData = z.infer<typeof stockThresholdSchema>;
