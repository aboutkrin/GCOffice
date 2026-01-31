"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { DocumentStatusBadge } from "./document-status-badge";
import { DocumentPreview } from "@/components/preview/document-preview";
import { deleteDocument, updateDocumentStatus, getDocumentForShare } from "@/actions/document-actions";
import { shareFile } from "@/lib/share";
import { formatThaiDate } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  QUOTATION_STATUS_OPTIONS,
  INVOICE_STATUS_OPTIONS,
} from "@/lib/constants";
import { Pencil, Eye, Trash2, ChevronDown, Share2, MoreHorizontal, Loader2 } from "lucide-react";

interface DocumentTableProps {
  documents: any[];
  basePath: string; // "/quotations" or "/invoices"
  documentType: "QUOTATION" | "INVOICE";
}

export function DocumentTable({ documents, basePath, documentType }: DocumentTableProps) {
  const STATUS_OPTIONS = documentType === "QUOTATION" ? QUOTATION_STATUS_OPTIONS : INVOICE_STATUS_OPTIONS;
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSharing, setIsSharing] = useState(false);
  const [shareDocData, setShareDocData] = useState<any>(null);
  const offscreenRef = useRef<HTMLDivElement>(null);

  const handleStatusChange = (docId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateDocumentStatus(docId, newStatus as any);
        toast.success(
          `เปลี่ยนสถานะเป็น "${DOCUMENT_STATUS_LABELS[newStatus]}" สำเร็จ`
        );
      } catch (error) {
        console.error("Status update failed:", error);
        toast.error("ไม่สามารถเปลี่ยนสถานะได้");
      }
    });
  };

  const handleShare = useCallback(async (docId: string) => {
    setIsSharing(true);
    try {
      const data = await getDocumentForShare(docId);
      setShareDocData(data);
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลเอกสารได้");
      setIsSharing(false);
    }
  }, []);

  useEffect(() => {
    if (!shareDocData || !offscreenRef.current) return;

    const el = offscreenRef.current;

    // Wait for all images to load
    const images = el.querySelectorAll("img");
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });

    let cancelled = false;

    Promise.all(imagePromises).then(async () => {
      if (cancelled) return;
      // Small delay for layout
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled) return;

      try {
        // Force A4 width for capture
        el.style.width = "210mm";
        el.style.maxWidth = "none";
        el.style.minHeight = "297mm";
        el.style.padding = "2rem";
        await new Promise((r) => setTimeout(r, 100));

        const canvas = await html2canvas(el, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
        });

        if (!blob) {
          toast.error("ไม่สามารถสร้างไฟล์สำหรับแชร์ได้");
          return;
        }

        const file = new File([blob], `${shareDocData.documentNumber}.jpg`, {
          type: "image/jpeg",
        });

        const shared = await shareFile({
          title: shareDocData.documentNumber,
          text: `เอกสาร ${shareDocData.documentNumber}`,
          files: [file],
        });

        if (!shared) {
          toast.info("อุปกรณ์ไม่รองรับการแชร์ไฟล์");
        }
      } catch (error) {
        console.error("Share failed:", error);
        toast.error("ไม่สามารถแชร์ไฟล์ได้");
      } finally {
        setShareDocData(null);
        setIsSharing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shareDocData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error("ยกเลิกเอกสารไม่สำเร็จ:", error);
    } finally {
      setDeleting(false);
    }
  };

  const getCustomerName = (doc: any) => {
    if (doc.customerSnapshot && typeof doc.customerSnapshot === "object") {
      const snapshot = doc.customerSnapshot as any;
      if (snapshot.type === "COMPANY" && snapshot.companyName) {
        return snapshot.companyName;
      }
      return snapshot.customerName || snapshot.companyName || "-";
    }
    return "-";
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        ยังไม่มีเอกสาร
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead>ลูกค้า</TableHead>
              <TableHead className="text-right">ยอดรวม</TableHead>
              <TableHead className="text-center">สถานะ</TableHead>
              <TableHead className="w-[160px] text-center">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {doc.documentNumber}
                </TableCell>
                <TableCell>
                  {formatThaiDate(new Date(doc.documentDate), "short")}
                </TableCell>
                <TableCell>{getCustomerName(doc)}</TableCell>
                <TableCell className="text-right">
                  {formatBaht(doc.grandTotal)}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center gap-1 cursor-pointer rounded-full transition-opacity hover:opacity-80"
                        disabled={isPending}
                      >
                        <DocumentStatusBadge status={doc.status} />
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      {STATUS_OPTIONS.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          disabled={status === doc.status}
                          onClick={() => handleStatusChange(doc.id, status)}
                        >
                          <Badge
                            className={`${DOCUMENT_STATUS_COLORS[status]} text-xs pointer-events-none`}
                          >
                            {DOCUMENT_STATUS_LABELS[status]}
                          </Badge>
                          {status === doc.status && (
                            <span className="ml-2 text-xs text-gray-400">
                              (ปัจจุบัน)
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="แก้ไข"
                      onClick={() => router.push(`${basePath}/${doc.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="ดูตัวอย่าง"
                      onClick={() => router.push(`${basePath}/${doc.id}/preview`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="แชร์"
                      disabled={isSharing}
                      onClick={() => handleShare(doc.id)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="ลบ"
                      onClick={() => setDeleteId(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="border rounded-lg p-4 space-y-2"
            onClick={() => router.push(`${basePath}/${doc.id}`)}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{doc.documentNumber}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center gap-1 cursor-pointer rounded-full transition-opacity hover:opacity-80"
                      disabled={isPending}
                    >
                      <DocumentStatusBadge status={doc.status} />
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        disabled={status === doc.status}
                        onClick={() => handleStatusChange(doc.id, status)}
                      >
                        <Badge
                          className={`${DOCUMENT_STATUS_COLORS[status]} text-xs pointer-events-none`}
                        >
                          {DOCUMENT_STATUS_LABELS[status]}
                        </Badge>
                        {status === doc.status && (
                          <span className="ml-2 text-xs text-gray-400">
                            (ปัจจุบัน)
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`${basePath}/${doc.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      ดู / แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isSharing}
                      onClick={() => handleShare(doc.id)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      แชร์
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteId(doc.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      ลบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatThaiDate(new Date(doc.documentDate), "short")}
              </span>
              <span className="font-semibold">
                {formatBaht(doc.grandTotal)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getCustomerName(doc)}
            </p>
          </div>
        ))}
      </div>

      {/* Off-screen preview for direct share */}
      {shareDocData && (
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "210mm",
            zIndex: -1,
          }}
        >
          <DocumentPreview ref={offscreenRef} document={shareDocData} />
        </div>
      )}

      {/* Share loading overlay */}
      {isSharing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-gray-700">
              กำลังสร้างไฟล์...
            </span>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกเอกสาร</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการยกเลิกเอกสารนี้หรือไม่? เอกสารจะถูกย้ายไปยังแท็บ &quot;ยกเลิก&quot;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ปิด</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "กำลังยกเลิก..." : "ยกเลิกเอกสาร"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
