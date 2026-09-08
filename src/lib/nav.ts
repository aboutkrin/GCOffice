import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  FileText,
  Receipt,
  ClipboardList,
  Tags,
  CalendarOff,
  Globe,
  Calculator,
  Wallet,
  ReceiptText,
  Truck,
  Printer,
  Warehouse,
  UserCog,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only ADMIN can see/use this item. */
  adminOnly?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, adminOnly: true },
  { href: "/quotations", label: "ใบเสนอราคา", icon: FileText },
  { href: "/invoices", label: "ใบแจ้งหนี้", icon: Receipt },
  { href: "/receipts", label: "ใบเสร็จรับเงิน", icon: ReceiptText },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/products", label: "สินค้า", icon: Package },
  { href: "/stock", label: "สต็อคสินค้า", icon: Warehouse },
  { href: "/product-costs", label: "ต้นทุนสินค้า", icon: Calculator, adminOnly: true },
  { href: "/vendor-costs", label: "ต้นทุนใบสั่งซื้อ", icon: Truck, adminOnly: true },
  { href: "/expenses", label: "ค่าใช้จ่ายรายเดือน", icon: Wallet, adminOnly: true },
  { href: "/print-order", label: "พิมพ์ใบส่งของ", icon: Printer },
];

export const SETTINGS_NAV: NavItem[] = [
  { href: "/categories", label: "หมวดหมู่สินค้า", icon: Tags, adminOnly: true },
  { href: "/payment-terms", label: "เงื่อนไขชำระเงิน", icon: ClipboardList, adminOnly: true },
  { href: "/holidays", label: "วันหยุด", icon: CalendarOff, adminOnly: true },
  { href: "/companies", label: "บริษัท", icon: Building2, adminOnly: true },
  { href: "/website-sync", label: "ซิงค์เว็บไซต์", icon: Globe, adminOnly: true },
  { href: "/users", label: "ผู้ใช้งาน", icon: UserCog, adminOnly: true },
];

export function filterNav(items: NavItem[], role: string): NavItem[] {
  return items.filter((item) => !item.adminOnly || role === "ADMIN");
}

/** Home page per role: ADMIN lands on the dashboard, STAFF on quotations. */
export const ROLE_HOME = { ADMIN: "/dashboard", STAFF: "/quotations" } as const;

export function homeFor(role: string): string {
  return role === "ADMIN" ? ROLE_HOME.ADMIN : ROLE_HOME.STAFF;
}
