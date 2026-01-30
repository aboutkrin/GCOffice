"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FilePlus,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  {
    href: "/dashboard",
    label: "หน้าหลัก",
    icon: LayoutDashboard,
  },
  {
    href: "/invoices",
    label: "ใบแจ้งหนี้",
    icon: FileText,
  },
  {
    href: "/quotations/new",
    label: "เสนอราคา",
    icon: FilePlus,
    isPrimary: true,
  },
  {
    href: "/products",
    label: "สินค้า",
    icon: Package,
  },
  {
    href: "/customers",
    label: "ลูกค้า",
    icon: Users,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t shadow-lg">
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => {
          const isActive =
            item.isPrimary
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 -mt-4"
              >
                <div className="flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground shadow-md">
                  <Icon className="size-5" />
                </div>
                <span className="text-[10px] font-medium text-primary">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[4rem] py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
