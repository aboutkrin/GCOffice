"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, PackagePlus, PackageMinus, ClipboardCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanInput } from "./scan-input";
import { resolveStockCodeAction } from "@/actions/stock-actions";
import { startStockDocumentWithItem } from "@/actions/stock-document-actions";

export function ScanLanding() {
  const router = useRouter();
  const [resolution, setResolution] = useState<any>(null);
  const [scannedCode, setScannedCode] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleScan = async (code: string) => {
    const result = await resolveStockCodeAction(code);
    if (result.kind === "not-found") {
      throw new Error(`ไม่พบสินค้าจากรหัส "${code}"`);
    }
    if (result.kind === "ambiguous") {
      throw new Error("รหัสนี้ตรงกับหลายรายการ กรุณาค้นหาด้วยตนเอง");
    }
    if (result.kind === "product-needs-variant") {
      throw new Error(`"${result.productName}" มีหลายสี กรุณาเลือกสีจากหน้ารายการสินค้า`);
    }
    setResolution(result);
    setScannedCode(code);
  };

  const handleAction = (type: "RECEIVE" | "ISSUE" | "COUNT", basePath: "receive" | "issue" | "count") => {
    if (!scannedCode) return;
    startTransition(async () => {
      try {
        const document = await startStockDocumentWithItem(type, scannedCode);
        router.push(`/stock/${basePath}/${document.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">สแกนสินค้า</h1>
        <p className="text-muted-foreground text-sm">
          สแกน QR หรือพิมพ์รหัสสินค้า เพื่อดูสต็อคและเริ่มรับเข้า/เบิกออก/นับ
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ScanInput onScan={handleScan} />
        </CardContent>
      </Card>

      {resolution && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="font-medium">
                {resolution.productName}
                {resolution.kind === "variant" && (
                  <span className="text-muted-foreground font-normal"> — {resolution.colorVariantName}</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground font-mono">{resolution.productSku}</p>
              <Badge variant="outline" className="mt-2">
                คงเหลือ {resolution.stockQuantity}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleAction("RECEIVE", "receive")}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
                รับเข้า
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleAction("ISSUE", "issue")}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <PackageMinus className="size-4" />}
                เบิกออก
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleAction("COUNT", "count")}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
                นับ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-center">
        <Link href="/stock" className="text-primary hover:underline">
          ไปหน้าสต็อคสินค้าทั้งหมด
        </Link>
      </p>
    </div>
  );
}
