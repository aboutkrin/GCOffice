import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().min(1, "กรุณาระบุรหัสสินค้า"),
  name: z.string().min(1, "กรุณาระบุชื่อสินค้า"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  sizeUnit: z.string().default("cm"),
  basePrice: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
  imageUrl: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const customerSchema = z.object({
  type: z.enum(["COMPANY", "INDIVIDUAL"]),
  companyName: z.string().optional(),
  customerName: z.string().min(1, "กรุณาระบุชื่อลูกค้า"),
  contactPerson: z.string().optional(),
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
  phone: z.string().optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  facebook: z.string().optional(),
  lineOa: z.string().optional(),
  tiktok: z.string().optional(),
  logoUrl: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
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
  showImage: z.boolean().default(false),
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
  deliveryDateStart: z.coerce.date().optional().nullable(),
  deliveryDateEnd: z.coerce.date().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ"),
  paymentTerms: z.array(paymentTermSchema).optional(),
}).refine(
  (data) => data.type !== "INVOICE" || (data.sourceQuotationId && data.sourceQuotationId.length > 0),
  { message: "กรุณาเลือกใบเสนอราคา", path: ["sourceQuotationId"] }
);

export type ProductFormData = z.infer<typeof productSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
export type DocumentFormData = z.infer<typeof documentSchema>;
export type LineItemFormData = z.infer<typeof lineItemSchema>;
export type PaymentTermFormData = z.infer<typeof paymentTermSchema>;
