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

export function NavGroup({ group, pathname, onNavigate }: NavGroupProps) {
  const isActive = group.items.some((item) => isItemActive(pathname, item, group.items));
  const [open, setOpen] = useState(isActive);
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
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
        <div className="ml-4 space-y-1 mt-1">
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
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50"
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
