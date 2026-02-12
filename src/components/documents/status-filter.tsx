"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from "@/lib/constants";

interface StatusFilterProps {
  basePath: string;
  statuses: string[];
}

export function StatusFilter({ basePath, statuses }: StatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (statuses.length === 0) return null;

  function clearFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">กรองสถานะ:</span>
      {statuses.map((status) => (
        <Badge
          key={status}
          variant="secondary"
          className={DOCUMENT_STATUS_COLORS[status] || ""}
        >
          {DOCUMENT_STATUS_LABELS[status] || status}
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearFilter}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3 mr-1" />
        ล้างตัวกรอง
      </Button>
    </div>
  );
}
