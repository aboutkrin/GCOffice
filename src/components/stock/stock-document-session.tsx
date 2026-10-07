"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatThaiDateTime } from "@/lib/thai-date";
import {
  STOCK_DOCUMENT_TYPE_LABELS,
  STOCK_DOCUMENT_STATUS_LABELS,
  STOCK_DOCUMENT_STATUS_COLORS,
} from "@/lib/constants";

import { ScanInput, type ScanInputHandle } from "./scan-input";
import { ScanQuantityPrompt } from "./scan-quantity-prompt";
import { StockDocumentLineRow } from "./stock-document-line-row";
import { StockCountVarianceSummary } from "./stock-count-variance-summary";
import { StockProductSearch, StockVariantChooser, type PickedStockItem } from "./stock-product-search";
import { resolveStockCodeAction } from "@/actions/stock-actions";
import type { StockCodeResolution } from "@/lib/stock-code";
import {
  addStockDocumentLine,
  postStockDocument,
  cancelStockDocument,
  deleteStockDocumentDraft,
} from "@/actions/stock-document-actions";

interface StockDocumentSessionProps {
  document: any;
  backHref: string;
  /** COUNT only: live variance of each counted line against current on-hand. */
  varianceLines?: any[];
}

export function StockDocumentSession({ document, backHref, varianceLines }: StockDocumentSessionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmPost, setConfirmPost] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingScan, setPendingScan] = useState<{
    resolution: PickedStockItem;
    fromCamera: boolean;
  } | null>(null);
  // Scanned a product QR whose stock is tracked per colour — ask which colour.
  const [needsVariant, setNeedsVariant] = useState<{
    resolution: Extract<StockCodeResolution, { kind: "product-needs-variant" }>;
    fromCamera: boolean;
  } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const scanInputRef = useRef<ScanInputHandle>(null);

  const isDraft = document.status === "DRAFT";
  const isIssueFromDocument = document.type === "ISSUE" && !!document.sourceDocumentId;

  const handleScan = async (code: string, meta: { fromCamera: boolean }) => {
    const resolution = await resolveStockCodeAction(code);
    if (resolution.kind === "not-found") {
      throw new Error(`ไม่พบสินค้าจากรหัส "${code}"`);
    }
    if (resolution.kind === "ambiguous") {
      throw new Error("รหัสนี้ตรงกับหลายรายการ กรุณาเลือกสินค้าด้วยตนเอง");
    }
    if (resolution.kind === "product-needs-variant") {
      setNeedsVariant({ resolution, fromCamera: meta.fromCamera });
      return;
    }
    setPendingScan({ resolution, fromCamera: meta.fromCamera });
  };

  const handleConfirmQuantity = (quantity: number) => {
    if (!pendingScan) return;
    const { resolution, fromCamera } = pendingScan;
    startTransition(async () => {
      try {
        await addStockDocumentLine(document.id, {
          productId: resolution.productId,
          colorVariantId: resolution.kind === "variant" ? resolution.colorVariantId : undefined,
          quantity,
        });
        setPendingScan(null);
        if (fromCamera) scanInputRef.current?.openCamera();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  const handleCancelScan = () => setPendingScan(null);

  const handleVariantPicked = (item: PickedStockItem) => {
    setPendingScan({ resolution: item, fromCamera: needsVariant?.fromCamera ?? false });
    setNeedsVariant(null);
  };

  const handlePost = () => {
    startTransition(async () => {
      try {
        await postStockDocument(document.id);
        toast.success("บันทึกเรียบร้อย สต็อคถูกปรับแล้ว", {
          action: { label: "ดูภาพรวมสต็อค", onClick: () => router.push("/stock") },
        });
        setConfirmPost(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setConfirmPost(false);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelStockDocument(document.id);
        toast.success("ยกเลิกเอกสารเรียบร้อยแล้ว");
        setConfirmCancel(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setConfirmCancel(false);
      }
    });
  };

  const handleDeleteDraft = () => {
    startTransition(async () => {
      try {
        await deleteStockDocumentDraft(document.id);
        toast.success("ลบร่างเรียบร้อยแล้ว");
        router.push(backHref);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        setConfirmDelete(false);
      }
    });
  };

  const totalQuantity = document.lines.reduce((sum: number, l: any) => sum + l.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{document.documentNumber}</h1>
              <Badge className={STOCK_DOCUMENT_STATUS_COLORS[document.status]}>
                {STOCK_DOCUMENT_STATUS_LABELS[document.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {STOCK_DOCUMENT_TYPE_LABELS[document.type]} · {formatThaiDateTime(new Date(document.documentDate))}
              {document.sourceDocument && (
                <>
                  {" · อ้างอิง "}
                  <Link href={`/quotations/${document.sourceDocument.id}`} className="text-primary hover:underline">
                    {document.sourceDocument.documentNumber}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        {isDraft && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} disabled={isPending}>
              <X className="size-4" />
              ลบร่าง
            </Button>
            <Button size="sm" onClick={() => setConfirmPost(true)} disabled={isPending || document.lines.length === 0}>
              <Check className="size-4" />
              บันทึกและปรับสต็อค
            </Button>
          </div>
        )}
        {document.status === "POSTED" && (
          <Button variant="outline" size="sm" onClick={() => setConfirmCancel(true)} disabled={isPending}>
            ยกเลิกเอกสาร (แอดมิน)
          </Button>
        )}
      </div>

      {isDraft && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            {document.type === "COUNT"
              ? "สแกน QR แล้วใส่จำนวนที่นับได้จริงของแต่ละรายการ"
              : "สแกน QR แล้วใส่จำนวน"}{" "}
            — ยังเป็นร่าง สต็อคจะยังไม่เปลี่ยนจนกว่าจะกด &quot;บันทึกและปรับสต็อค&quot;
          </span>
        </div>
      )}

      {isDraft && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <ScanInput
              ref={scanInputRef}
              onScan={handleScan}
              disabled={isPending || !!pendingScan || !!needsVariant}
            />
            {needsVariant && (
              <StockVariantChooser
                product={{
                  id: needsVariant.resolution.productId,
                  name: needsVariant.resolution.productName,
                  sku: needsVariant.resolution.productSku,
                }}
                variants={needsVariant.resolution.colorVariants}
                onPick={handleVariantPicked}
                onCancel={() => setNeedsVariant(null)}
              />
            )}
            {!pendingScan && !needsVariant && (
              showSearch ? (
                <StockProductSearch
                  disabled={isPending}
                  onPick={(item) => setPendingScan({ resolution: item, fromCamera: false })}
                />
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="size-3.5" />
                  ไม่มี QR? ค้นหาสินค้าด้วยชื่อหรือรหัส
                </button>
              )
            )}
            {pendingScan && (
              <ScanQuantityPrompt
                resolution={pendingScan.resolution}
                documentType={document.type}
                pending={isPending}
                onConfirm={handleConfirmQuantity}
                onCancel={handleCancelScan}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {document.lines.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              ยังไม่มีรายการ — สแกนหรือพิมพ์รหัสสินค้าด้านบนเพื่อเพิ่ม
            </p>
          ) : (
            <div>
              {document.lines.map((line: any) => (
                <StockDocumentLineRow
                  key={line.id}
                  line={line}
                  editable={isDraft}
                  showOrderedProgress={isIssueFromDocument}
                  onChanged={() => router.refresh()}
                />
              ))}
              <div className="flex items-center justify-between pt-3 mt-1 border-t font-medium">
                <span>รวม</span>
                <span className="font-mono">{totalQuantity}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {document.type === "COUNT" && varianceLines && varianceLines.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">ผลต่างจากสต็อคระบบ</h2>
          <StockCountVarianceSummary lines={varianceLines} />
        </div>
      )}

      {document.movements && document.movements.length > 0 && (
        <p className="text-sm text-muted-foreground">
          บันทึกแล้วเมื่อ {document.postedAt && formatThaiDateTime(new Date(document.postedAt))} โดย{" "}
          {document.postedBy?.fullName || document.postedBy?.username}
        </p>
      )}

      <AlertDialog open={confirmPost} onOpenChange={setConfirmPost}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันบันทึกเอกสาร</AlertDialogTitle>
            <AlertDialogDescription>
              {document.type === "COUNT"
                ? `สต็อคของ ${document.lines.length} รายการที่นับจะถูกตั้งเป็นจำนวนที่นับได้ (รายการที่ไม่ได้นับจะไม่เปลี่ยน)`
                : `สต็อคจะถูก${document.type === "RECEIVE" ? "เพิ่ม" : "ลด"}ตามรายการทั้งหมด ${document.lines.length} รายการ (${totalQuantity} กล่อง)`}
              {" "}และไม่สามารถแก้ไขรายการได้อีกหลังจากนี้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handlePost} disabled={isPending}>
              บันทึกและปรับสต็อค
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันยกเลิกเอกสาร</AlertDialogTitle>
            <AlertDialogDescription>
              ระบบจะสร้างเอกสารกลับรายการเพื่อคืนสต็อคทั้งหมดของเอกสารนี้ การกระทำนี้ต้องใช้สิทธิ์แอดมิน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isPending}>
              ยืนยันยกเลิกเอกสาร
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันลบร่าง</AlertDialogTitle>
            <AlertDialogDescription>ร่างเอกสารนี้จะถูกลบและไม่สามารถกู้คืนได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDraft} disabled={isPending}>
              ลบร่าง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
