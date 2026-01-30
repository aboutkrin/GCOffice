export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ฉบับร่าง",
  SENT: "ส่งแล้ว",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

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
