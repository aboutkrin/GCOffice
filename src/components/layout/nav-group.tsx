"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup as NavGroupType, NavItem } from "@/lib/nav";

interface NavGroupProps {
  group: NavGroupType;
  pathname: string;
  /** Called when a leaf item is clicked, e.g. to close a mobile Sheet menu. */
  onNavigate?: () => void;
}

// Exact match or subpath — but yield to a sibling whose href is a more specific
// prefix of the path, so "/stock" isn't also lit while on "/stock/receive".
function isItemActive(pathname: string, item: NavItem, siblings: NavItem[]) {
  if (pathname === item.href) return true;
  if (!pathname.startsWith(item.href + "/")) return false;
  return !siblings.some(
    (s) =>
      s.href !== item.href &&
      s.href.startsWith(item.href + "/") &&
      (pathname === s.href || pathname.startsWith(s.href + "/"))
  );
}

// One colour per group so expanded groups are easy to tell apart.
// Full class names so Tailwind can see them.
const GROUP_COLORS: Record<string, { box: string; bar: string; head: string; active: string }> = {
  เอกสาร: {
    box: "bg-blue-50 dark:bg-blue-950/30",
    bar: "border-blue-400",
    head: "text-blue-700 dark:text-blue-300",
    active: "bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100",
  },
  สินค้า: {
    box: "bg-emerald-50 dark:bg-emerald-950/30",
    bar: "border-emerald-400",
    head: "text-emerald-700 dark:text-emerald-300",
    active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100",
  },
  สต็อคสินค้า: {
    box: "bg-amber-50 dark:bg-amber-950/30",
    bar: "border-amber-400",
    head: "text-amber-700 dark:text-amber-300",
    active: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
  },
  ต้นทุนและค่าใช้จ่าย: {
    box: "bg-violet-50 dark:bg-violet-950/30",
    bar: "border-violet-400",
    head: "text-violet-700 dark:text-violet-300",
    active: "bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100",
  },
};

const DEFAULT_COLOR = {
  box: "bg-slate-50 dark:bg-slate-900/30",
  bar: "border-slate-400",
  head: "text-slate-700 dark:text-slate-300",
  active: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
};

export function NavGroup({ group, pathname, onNavigate }: NavGroupProps) {
  const isActive = group.items.some((item) => isItemActive(pathname, item, group.items));
  const [open, setOpen] = useState(isActive);
  const Icon = group.icon;
  const color = GROUP_COLORS[group.label] ?? DEFAULT_COLOR;

  return (
    <div className={cn("rounded-md", open && cn("border-l-4 pb-1", color.box, color.bar))}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          open
            ? cn("font-medium", color.head)
            : isActive
              ? "text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50"
        )}
      >
        <Icon className="size-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open ? "rotate-0" : "-rotate-90")}
        />
      </button>
      {open && (
        <div className="ml-2 mr-1 space-y-1 mt-1">
          {group.items.map((item) => {
            const active = isItemActive(pathname, item, group.items);
            const ItemIcon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? cn("font-medium", color.active)
                    : "text-muted-foreground hover:bg-white/60 dark:hover:bg-white/10"
                )}
              >
                <ItemIcon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
