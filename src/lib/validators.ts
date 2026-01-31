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

export const documentSchema = z.object({
  type: z.enum(["QUOTATION", "INVOICE"]),
  documentDate: z.coerce.date(),
  companyId: z.string().min(1, "กรุณาเลือกบริษัท"),
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  sourceQuotationId: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).optional().nullable(),
  discountValue: z.coerce.number().optional(),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().default(7),
  footerNotes: z.string().optional(),
  productionDays: z.string().optional(),
  productionDaysMin: z.coerce.number().int().min(1, "ต้องมากกว่า 0").optional().nullable(),
  productionDaysMax: z.coerce.number().int().min(1, "ต้องมากกว่า 0").optional().nullable(),
  skipWeekends: z.boolean().default(false),
  skipHolidays: z.boolean().default(false),
  deliveryDateStart: z.coerce.date().optional().nullable(),
  deliveryDateEnd: z.coerce.date().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"),
  paymentTerms: z.array(paymentTermSchema).optional(),
}).refine(
  (data) => data.type !== "INVOICE" || (data.sourceQuotationId && data.sourceQuotationId.length > 0),
  { message: "กรุณาเลือกใบเสนอราคา", path: ["sourceQuotationId"] }
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

export type PaymentTermTemplateItemFormData = z.infer<typeof paymentTermTemplateItemSchema>;
export type PaymentTermTemplateFormData = z.infer<typeof paymentTermTemplateSchema>;
export type WooCommerceConfigFormData = z.infer<typeof wooCommerceConfigSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
