"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface StockDocTabsProps {
  active: "receive" | "issue";
}

const TABS: { value: "receive" | "issue"; href: string; label: string }[] = [
  { value: "receive", href: "/stock/receive", label: "รับเข้า" },
  { value: "issue", href: "/stock/issue", label: "เบิกออก" },
];

export function StockDocTabs({ active }: StockDocTabsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
