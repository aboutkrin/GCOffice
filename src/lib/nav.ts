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
  PackagePlus,
  UserCog,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only ADMIN can see/use this item. */
  adminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

/** A top-level sidebar entry: either a single link or a collapsible group of links. */
export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export const MAIN_NAV: NavEntry[] = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, adminOnly: true },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  {
    label: "เอกสาร",
    icon: FileText,
    items: [
      { href: "/quotations", label: "ใบเสนอราคา", icon: FileText },
      { href: "/invoices", label: "ใบแจ้งหนี้", icon: Receipt },
      { href: "/receipts", label: "ใบเสร็จรับเงิน", icon: ReceiptText },
    ],
  },
  {
    label: "สินค้าและสต็อค",
    icon: Package,
    items: [
      { href: "/products", label: "สินค้า", icon: Package },
      { href: "/stock", label: "สต็อคสินค้า", icon: Warehouse },
      { href: "/stock/receive", label: "รับเข้า/เบิกออก", icon: PackagePlus },
      { href: "/print-order", label: "พิมพ์ใบส่งของ", icon: Printer },
    ],
  },
  {
    label: "ต้นทุนและค่าใช้จ่าย",
    icon: Calculator,
    items: [
      { href: "/product-costs", label: "ต้นทุนสินค้า", icon: Calculator, adminOnly: true },
      { href: "/vendor-costs", label: "ต้นทุนใบสั่งซื้อ", icon: Truck, adminOnly: true },
      { href: "/expenses", label: "ค่าใช้จ่ายรายเดือน", icon: Wallet, adminOnly: true },
    ],
  },
];

export const SETTINGS_NAV: NavItem[] = [
  { href: "/categories", label: "หมวดหมู่สินค้า", icon: Tags, adminOnly: true },
  { href: "/payment-terms", label: "เงื่อนไขชำระเงิน", icon: ClipboardList, adminOnly: true },
  { href: "/holidays", label: "วันหยุด", icon: CalendarOff, adminOnly: true },
  { href: "/companies", label: "บริษัท", icon: Building2, adminOnly: true },
  { href: "/website-sync", label: "ซิงค์เว็บไซต์", icon: Globe, adminOnly: true },
  { href: "/users", label: "ผู้ใช้งาน", icon: UserCog, adminOnly: true },
];

/** SETTINGS_NAV expressed as a NavGroup so it can be rendered through the same component as MAIN_NAV's groups. */
export const SETTINGS_GROUP: NavGroup = {
  label: "การตั้งค่า",
  icon: Settings,
  items: SETTINGS_NAV,
};

export function filterNav(entries: NavEntry[], role: string): NavEntry[] {
  return entries
    .map((entry) => {
      if (!isNavGroup(entry)) {
        return !entry.adminOnly || role === "ADMIN" ? entry : null;
      }
      const visibleItems = entry.items.filter((item) => !item.adminOnly || role === "ADMIN");
      return visibleItems.length > 0 ? { ...entry, items: visibleItems } : null;
    })
    .filter((entry): entry is NavEntry => entry !== null);
}

/** Home page per role: ADMIN lands on the dashboard, STAFF on quotations. */
export const ROLE_HOME = { ADMIN: "/dashboard", STAFF: "/quotations" } as const;

export function homeFor(role: string): string {
  return role === "ADMIN" ? ROLE_HOME.ADMIN : ROLE_HOME.STAFF;
}
