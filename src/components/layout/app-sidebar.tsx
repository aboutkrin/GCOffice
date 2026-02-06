"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Settings,
  ChevronDown,
  ShoppingCart,
  Calculator,
  Wallet,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNavItems = [
  {
    href: "/dashboard",
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
  },
  {
    href: "/quotations",
    label: "ใบเสนอราคา",
    icon: FileText,
  },
  {
    href: "/invoices",
    label: "ใบแจ้งหนี้",
    icon: Receipt,
  },
  {
    href: "/receipts",
    label: "ใบเสร็จรับเงิน",
    icon: ReceiptText,
  },
  {
    href: "/customers",
    label: "ลูกค้า",
    icon: Users,
  },
  {
    href: "/products",
    label: "สินค้า",
    icon: Package,
  },
  {
    href: "/product-costs",
    label: "ต้นทุนสินค้า",
    icon: Calculator,
  },
  {
    href: "/expenses",
    label: "ค่าใช้จ่ายรายเดือน",
    icon: Wallet,
  },
];

const settingsNavItems = [
  {
    href: "/categories",
    label: "หมวดหมู่สินค้า",
    icon: Tags,
  },
  {
    href: "/payment-terms",
    label: "เงื่อนไขชำระเงิน",
    icon: ClipboardList,
  },
  {
    href: "/holidays",
    label: "วันหยุด",
    icon: CalendarOff,
  },
  {
    href: "/companies",
    label: "บริษัท",
    icon: Building2,
  },
  {
    href: "/woocommerce",
    label: "WooCommerce",
    icon: ShoppingCart,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isSettingsActive = settingsNavItems.some(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">GCOffice</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-4">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}

        {/* การตั้งค่า submenu */}
        <div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isSettingsActive
                ? "text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            <Settings className="size-4" />
            <span className="flex-1 text-left">การตั้งค่า</span>
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                settingsOpen ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {settingsOpen && (
            <div className="ml-4 space-y-1 mt-1">
              {settingsNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
