export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง",
  QUOTED: "เสนอราคาแล้ว",
  CONFIRMED: "ยืนยันสั่งซื้อ",
  SAMPLE: "ตัวอย่าง",
  BILLED: "เรียกเก็บแล้ว",
  PAID: "ชำระแล้ว",
  CANCELLED: "ยกเลิก",
};

export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  QUOTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  SAMPLE: "bg-purple-100 text-purple-800",
  BILLED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const QUOTATION_STATUS_OPTIONS = ["DRAFT", "QUOTED", "CONFIRMED", "SAMPLE", "CANCELLED"] as const;
export const INVOICE_STATUS_OPTIONS = ["DRAFT", "BILLED", "PAID", "CANCELLED"] as const;

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  COMPANY: "นิติบุคคล",
  INDIVIDUAL: "บุคคลธรรมดา",
};

export const LEAD_TYPE_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINE_OA: "LINE OA",
  TIKTOK: "TikTok",
  WEBSITE: "เว็บไซต์",
  REFERRAL: "แนะนำ",
  OTHER: "อื่นๆ",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  QUOTATION: "ใบเสนอราคา",
  INVOICE: "ใบแจ้งหนี้",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ใช้งาน",
  INACTIVE: "ไม่ใช้งาน",
};

export const PRODUCT_SOURCE_LABELS: Record<string, string> = {
  MANUAL: "เพิ่มเอง",
  WOOCOMMERCE: "WooCommerce",
};

export const SYNC_STATUS_LABELS: Record<string, string> = {
  RUNNING: "กำลังซิงค์",
  COMPLETED: "สำเร็จ",
  FAILED: "ล้มเหลว",
};

export const SYNC_STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export const SYNC_TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "ซิงค์เอง",
  SCHEDULED: "อัตโนมัติ",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CREDIT_CARD: "บัตรเครดิต",
  PROMPTPAY: "พร้อมเพย์",
  OTHER: "อื่นๆ",
};

export const PAYMENT_METHOD_OPTIONS = ["CASH", "TRANSFER", "CREDIT_CARD", "PROMPTPAY", "OTHER"] as const;