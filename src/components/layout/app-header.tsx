"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LogOut,
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
  Globe,
  User,
  ReceiptText,
  Printer,
  Calculator,
  Truck,
  Wallet,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AppHeaderProps {
  user: {
    email?: string;
  };
}

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
    href: "/products",
    label: "สินค้า",
    icon: Package,
  },
  {
    href: "/stock",
    label: "สต็อคสินค้า",
    icon: Warehouse,
  },
  {
    href: "/customers",
    label: "ลูกค้า",
    icon: Users,
  },
  {
    href: "/product-costs",
    label: "ต้นทุนสินค้า",
    icon: Calculator,
  },
  {
    href: "/vendor-costs",
    label: "ต้นทุนใบสั่งซื้อ",
    icon: Truck,
  },
  {
    href: "/expenses",
    label: "ค่าใช้จ่ายรายเดือน",
    icon: Wallet,
  },
  {
    href: "/print-order",
    label: "พิมพ์ใบส่งของ",
    icon: Printer,
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
    href: "/website-sync",
    label: "ซิงค์เว็บไซต์",
    icon: Globe,
  },
];

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isSettingsActive = settingsNavItems.some(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  const userInitial = user.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6">
      {/* Mobile menu button */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
            <span className="sr-only">เปิดเมนู</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-6">
            <SheetTitle className="text-left">GCOffice</SheetTitle>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto space-y-1 p-4">
            {mainNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
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
                        onClick={() => setMenuOpen(false)}
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
        </SheetContent>
      </Sheet>

      {/* Page title area */}
      <div className="flex-1" />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar>
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">บัญชีผู้ใช้</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/profile">
              <User className="size-4" />
              ตั้งค่าโปรไฟล์
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer"
          >
            <LogOut className="size-4" />
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
