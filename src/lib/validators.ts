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

export const printOrderSettingsSchema = z.object({
  address: z.string().optional(),
  phone: z.string().optional(),
  lineOa: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  logoUrl: z.string().optional(),
});

export const lineItemSchema = z.object({
  sequence: z.number(),
  productSku: z.string().optional(),
  productName: z.string().min(1, "กรุณาระบุชื่อสินค้า"),
  productImage: z.string().optional(),
  colorVariantName: z.string().optional(),
  colorVariantSku: z.string().optional(),
  /** Stable identity backing reservation/issue matching (see product-picker.tsx). */
  productId: z.string().optional().nullable(),
  colorVariantId: z.string().optional().nullable(),
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

export const depositDeductionSchema = z.object({
  sequence: z.number(),
  depositDocumentId: z.string().optional().nullable(),
  label: z.string().min(1, "กรุณาระบุรายการหัก"),
  taxInvoiceNumber: z.string().optional(),
  amount: z.coerce.number().min(0, "ยอดหักต้องไม่ติดลบ"),
  depositDate: z.preprocess(
    (val) => (val === null || val === undefined || val === "" ? null : val),
    z.coerce.date().nullable()
  ).optional(),
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
  customInvoiceNumber: z.string().optional(),
  sourceQuotationId: z.string().optional(),
  sourceInvoiceId: z.string().optional(),
  receiptPaymentType: z.enum(["FULL", "DEPOSIT", "BALANCE"]).optional(),
  receiptAmount: z.coerce.number().finite().positive("กรุณาระบุยอดรับชำระมากกว่า 0").optional(),
  isDepositInvoice: z.boolean().default(false),
  taxInvoiceNumber: z.string().optional(),
  depositPercent: z.coerce.number().optional().nullable(),
  depositDeductions: z.array(depositDeductionSchema).optional(),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).optional().nullable(),
  discountValue: z.coerce.number().optional(),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().default(7),
  shippingCost: z.coerce.number().min(0, "ค่าจัดส่งต้องไม่ติดลบ").default(0),
  shippingLocation: z.string().optional(),
  freeShipping: z.boolean().default(false),
  freeShippingLocation: z.string().optional(),
  pickupAtShowroom: z.boolean().default(false),
  footerNotes: z.string().optional(),
  productionDays: z.string().optional(),
  productionDaysMin: z.coerce.number().int().min(1, "ต้องมากกว่า 0").optional().nullable(),
  productionDaysMax: z.coerce.number().int().min(1, "ต้องมากกว่า 0").optional().nullable(),
  skipWeekends: z.boolean().default(true),
  skipHolidays: z.boolean().default(true),
  deliveryDateStart: z.preprocess(
    (val) => (val === null || val === undefined || val === "" ? null : val),
    z.coerce.date().nullable()
  ).optional(),
  deliveryDateEnd: z.preprocess(
    (val) => (val === null || val === undefined || val === "" ? null : val),
    z.coerce.date().nullable()
  ).optional(),
  deliveryCompletedDate: z.preprocess(
    (val) => (val === null || val === undefined || val === "" ? null : val),
    z.coerce.date().nullable()
  ).optional(),
  paymentDate: z.preprocess(
    (val) => (val === null || val === undefined || val === "" ? null : val),
    z.coerce.date().nullable()
  ).optional(),
  lineItems: z.array(lineItemSchema).min(1, "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ").max(30, "รายการสินค้าต้องไม่เกิน 30 รายการ"),
  paymentTerms: z.array(paymentTermSchema).optional(),
}).refine(
  (data) => data.type !== "INVOICE" || (data.sourceQuotationId && data.sourceQuotationId.length > 0),
  { message: "กรุณาเลือกใบเสนอราคา", path: ["sourceQuotationId"] }
).refine(
  (data) => data.type !== "RECEIPT" || (data.sourceInvoiceId && data.sourceInvoiceId.length > 0),
  { message: "กรุณาเลือกใบแจ้งหนี้", path: ["sourceInvoiceId"] }
).refine(
  (data) => !data.isDepositInvoice || (data.taxInvoiceNumber && data.taxInvoiceNumber.trim().length > 0),
  { message: "กรุณาระบุเลขที่ใบกำกับภาษี", path: ["taxInvoiceNumber"] }
).refine(
  (data) => !data.isDepositInvoice || data.type === "INVOICE",
  { message: "เฉพาะใบแจ้งหนี้เท่านั้นที่ออกเป็นใบมัดจำได้", path: ["isDepositInvoice"] }
).refine(
  (data) => !data.isDepositInvoice || !data.depositDeductions || data.depositDeductions.length === 0,
  { message: "ใบแจ้งหนี้มัดจำหักเงินมัดจำไม่ได้", path: ["depositDeductions"] }
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
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ExpenseCategoryFormData = z.infer<typeof expenseCategorySchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const vendorCostItemSchema = z.object({
  sequence: z.number(),
  productName: z.string().min(1, "กรุณาระบุชื่อสินค้า"),
  productSku: z.string().optional(),
  productImage: z.string().optional(),
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
  price: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ").optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

export const colorVariantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "กรุณาระบุชื่อสี"),
  colorHex: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ").optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  // Website-owned colours (synced from goodchoiceth.com); informational on the client,
  // the server re-reads ownership from the database before writing.
  websiteVariantId: z.number().int().optional().nullable(),
  websiteActive: z.boolean().optional(),
  /** Website colour code (e.g. YSP125-Q302); read-only, the sync owns it. */
  sku: z.string().optional().nullable(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "กรุณาเลือกสินค้า"),
  colorVariantId: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0"),
  reason: z.string().optional(),
  reference: z.string().optional(),
  lotNumber: z.string().optional(),
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

// ============================================================
// STOCK DOCUMENTS (goods receive / goods issue / stock count)
// ============================================================

export const createStockDocumentSchema = z.object({
  type: z.enum(["RECEIVE", "ISSUE", "COUNT"]),
  documentDate: z.coerce.date(),
  note: z.string().optional(),
  reference: z.string().optional(),
  lotNumber: z.string().optional(),
  sourceDocumentId: z.string().optional().nullable(),
});

export const stockScanSchema = z.object({
  code: z.string().min(1, "กรุณาสแกนหรือกรอกรหัส"),
  quantity: z.coerce.number().int().min(1, "จำนวนต้องมากกว่า 0").default(1),
});

export const stockDocumentLineSchema = z.object({
  productId: z.string().min(1, "กรุณาเลือกสินค้า"),
  colorVariantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int(),
  lotNumber: z.string().optional(),
  note: z.string().optional(),
  sourceLineItemId: z.string().optional().nullable(),
});

export const stockCountLineSchema = z.object({
  productId: z.string().min(1, "กรุณาเลือกสินค้า"),
  colorVariantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(0, "จำนวนต้องไม่ติดลบ"),
  note: z.string().optional(),
});

export const labelPrintSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        colorVariantId: z.string().optional().nullable(),
        copies: z.coerce.number().int().min(1).max(99).default(1),
      })
    )
    .min(1, "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ"),
});

export type CreateStockDocumentFormData = z.infer<typeof createStockDocumentSchema>;
export type StockScanFormData = z.infer<typeof stockScanSchema>;
export type StockDocumentLineFormData = z.infer<typeof stockDocumentLineSchema>;
export type StockCountLineFormData = z.infer<typeof stockCountLineSchema>;
export type LabelPrintFormData = z.infer<typeof labelPrintSchema>;

const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร")
  .max(30, "ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร")
  .regex(/^[a-z0-9._-]+$/, "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง และขีดล่าง");

export const loginSchema = z.object({
  username: usernameField,
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const userCreateSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  username: usernameField,
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  firstName: z.string().min(1, "กรุณาระบุชื่อ"),
  lastName: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF"], { error: "กรุณาเลือกสิทธิ์การใช้งาน" }),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const userUpdateSchema = z.object({
  username: usernameField,
  firstName: z.string().min(1, "กรุณาระบุชื่อ"),
  lastName: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF"], { error: "กรุณาเลือกสิทธิ์การใช้งาน" }),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").optional().or(z.literal("")),
});

export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
