"use client";

import { useTransition, useState } from "react";
import { Loader2, SearchCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  previewManualColorVariantCleanup,
  cleanupManualColorVariants,
  type ManualColorVariantCleanupSummary,
} from "@/actions/catalog-actions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ColorVariantCleanupCard() {
  const [isPreviewing, startPreviewing] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [preview, setPreview] = useState<ManualColorVariantCleanupSummary | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const busy = isPreviewing || isDeleting;

  function handlePreview() {
    startPreviewing(async () => {
      try {
        const result = await previewManualColorVariantCleanup();
        setPreview(result);
        setPreviewOpen(true);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจสอบ"
        );
      }
    });
  }

  function handleCleanup() {
    startDeleting(async () => {
      try {
        const result = await cleanupManualColorVariants();
        toast.success(`ลบสีที่กรอกเองแล้ว ${result.deleted} รายการ`);
        setPreviewOpen(false);
        setPreview(null);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ"
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ลบสีสินค้าที่กรอกเอง</CardTitle>
        <CardDescription>
          ลบข้อมูลสีที่พิมพ์เองไว้ก่อนหน้านี้บนสินค้าที่ซิงค์จากเว็บไซต์แล้ว
          เหลือไว้เฉพาะสีที่ลิงค์กับเว็บไซต์ สินค้าที่เพิ่มเองใน GCOffice (ไม่ได้ซิงค์) จะไม่ถูกแตะต้อง
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handlePreview} disabled={busy} variant="outline">
          {isPreviewing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SearchCheck className="size-4" />
          )}
          ตรวจสอบรายการที่จะลบ
        </Button>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>สีที่กรอกเองซึ่งจะถูกลบ</DialogTitle>
            <DialogDescription>
              ยังไม่มีการลบข้อมูล — ตรวจสอบรายการก่อนกดยืนยัน
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                ทั้งหมด {preview.count.toLocaleString("th-TH")} รายการ
                {preview.totalStockQuantity > 0 && (
                  <span className="text-amber-700">
                    {" "}
                    · รวมสต็อกที่จะหายไป {preview.totalStockQuantity.toLocaleString("th-TH")} ชิ้น
                  </span>
                )}
              </div>

              {preview.count > 0 ? (
                <div className="rounded-md border max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>สินค้า</TableHead>
                        <TableHead>สี (กรอกเอง)</TableHead>
                        <TableHead className="text-right">สต็อก</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.items.map((item) => (
                        <TableRow key={item.variantId}>
                          <TableCell>
                            {item.productName}
                            <span className="text-muted-foreground text-xs">
                              {" "}
                              ({item.productSku})
                            </span>
                          </TableCell>
                          <TableCell>{item.variantName}</TableCell>
                          <TableCell className="text-right">
                            {item.stockQuantity.toLocaleString("th-TH")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  ไม่พบสีที่กรอกเองซ้ำกับเว็บไซต์
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              ปิด
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCleanup}
              disabled={busy || !preview?.count}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              ยืนยันลบ {preview?.count ?? 0} รายการ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
