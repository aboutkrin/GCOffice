"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="mt-4 text-xl font-semibold">
        เกิดข้อผิดพลาด
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง
      </p>
      <Button onClick={reset} className="mt-6">
        ลองใหม่
      </Button>
    </div>
  );
}
