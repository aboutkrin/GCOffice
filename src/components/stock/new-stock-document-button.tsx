"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createStockDocument } from "@/actions/stock-document-actions";

interface NewStockDocumentButtonProps {
  type: "RECEIVE" | "ISSUE" | "COUNT";
  label: string;
  basePath: "receive" | "issue" | "count";
  variant?: "default" | "outline";
}

export function NewStockDocumentButton({ type, label, basePath, variant = "default" }: NewStockDocumentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const doc = await createStockDocument({ type, documentDate: new Date() });
        router.push(`/stock/${basePath}/${doc.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <Button onClick={handleClick} disabled={isPending} variant={variant}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      {label}
    </Button>
  );
}
