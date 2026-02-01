"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import {
  FileDown,
  ImageIcon,
  Share2,
  Printer,
  Pencil,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPdf } from "@/lib/export-pdf";
import { exportToJpg } from "@/lib/export-jpg";
import { shareFile } from "@/lib/share";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  QUOTATION_STATUS_OPTIONS,
  INVOICE_STATUS_OPTIONS,
} from "@/lib/constants";

interface ExportToolbarProps {
  documentRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  documentId: string;
  currentStatus: string;
  documentType: "QUOTATION" | "INVOICE";
}

export function ExportToolbar({
  documentRef,
  filename,
  documentId,
  currentStatus,
  documentType,
}: ExportToolbarProps) {
  const STATUS_OPTIONS = documentType === "QUOTATION" ? QUOTATION_STATUS_OPTIONS : INVOICE_STATUS_OPTIONS;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const autoActionTriggered = useRef(false);

  const getElement = useCallback((): HTMLElement | null => {
    return documentRef.current;
  }, [documentRef]);

  // Detect iOS (all iOS browsers use WebKit which doesn't support <a download>)
  const getIsIOS = useCallback((): boolean => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    // Standard iOS detection + iPad detection (iPadOS reports as MacIntel with touch)
    return /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }, []);

  // Pre-open a blank window synchronously (must be called in user gesture handler)
  // to avoid iOS popup blocker, then navigate it to the blob URL after async export
  const openIOSWindow = useCallback((): Window | null => {
    if (!getIsIOS()) return null;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(
        '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>กำลังโหลด...</title></head>' +
        '<body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;">' +
        '<p style="color:#666;font-size:16px;">กำลังสร้างไฟล์...</p></body></html>'
      );
    }
    return win;
  }, [getIsIOS]);

  // Force A4 width for export, then revert after capture
  const withA4Width = useCallback(
    async <T,>(el: HTMLElement, fn: () => Promise<T>): Promise<T> => {
      const origWidth = el.style.width;
      const origMaxWidth = el.style.maxWidth;
      const origMinHeight = el.style.minHeight;
      const origPadding = el.style.padding;
      el.style.width = "210mm";
      el.style.maxWidth = "none";
      el.style.minHeight = "297mm";
      el.style.padding = "2rem";
      // Wait for reflow
      await new Promise((r) => setTimeout(r, 100));
      try {
        return await fn();
      } finally {
        el.style.width = origWidth;
        el.style.maxWidth = origMaxWidth;
        el.style.minHeight = origMinHeight;
        el.style.padding = origPadding;
      }
    },
    []
  );

  // Export to PDF
  const handleExportPdf = useCallback(async () => {
    const el = getElement();
    if (!el) return;

    // Pre-open window synchronously (within user gesture) for iOS
    const iosWindow = openIOSWindow();

    setIsExporting(true);
    setExportLabel("กำลังสร้างไฟล์ PDF...");
    try {
      await withA4Width(el, () => exportToPdf(el, filename, iosWindow));
      toast.success("สร้างไฟล์ PDF สำเร็จ");
    } catch (error) {
      console.error("PDF export failed:", error);
      if (iosWindow) iosWindow.close();
      toast.error("ไม่สามารถสร้างไฟล์ PDF ได้");
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  }, [getElement, filename, withA4Width, openIOSWindow]);

  // Export to JPG
  const handleExportJpg = useCallback(async () => {
    const el = getElement();
    if (!el) return;

    // Pre-open window synchronously (within user gesture) for iOS
    const iosWindow = openIOSWindow();

    setIsExporting(true);
    setExportLabel("กำลังสร้างรูปภาพ...");
    try {
      await withA4Width(el, () => exportToJpg(el, filename, iosWindow));
      toast.success("สร้างรูปภาพสำเร็จ");
    } catch (error) {
      console.error("JPG export failed:", error);
      if (iosWindow) iosWindow.close();
      toast.error("ไม่สามารถสร้างรูปภาพได้");
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  }, [getElement, filename, withA4Width, openIOSWindow]);

  // Share
  const handleShare = useCallback(async () => {
    const el = getElement();
    if (!el) return;

    setIsExporting(true);
    setExportLabel("กำลังสร้างไฟล์...");
    try {
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

      const file = new File([blob], `${filename}.jpg`, {
        type: "image/jpeg",
      });

      const shared = await shareFile({
        title: filename,
        text: `เอกสาร ${filename}`,
        files: [file],
      });

      if (!shared) {
        toast.info("อุปกรณ์ไม่รองรับการแชร์ไฟล์");
      }
    } catch (error) {
      console.error("Share failed:", error);
      toast.error("ไม่สามารถแชร์ไฟล์ได้");
    } finally {
      setIsExporting(false);
      setExportLabel("");
    }
  }, [getElement, filename]);

  // Print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Navigate to edit page
  const handleEdit = useCallback(() => {
    // Determine path based on current URL
    const path = window.location.pathname;
    const editPath = path.replace("/preview", "");
    router.push(editPath);
  }, [router]);

  // Auto-trigger export action from query param
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action || autoActionTriggered.current) return;
    autoActionTriggered.current = true;

    const timer = setTimeout(() => {
      if (action === "pdf") handleExportPdf();
      else if (action === "jpg") handleExportJpg();
      else if (action === "share") handleShare();

      // Clear the query param so it doesn't re-fire on refresh
      const path = window.location.pathname;
      router.replace(path);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, handleExportPdf, handleExportJpg, handleShare, router]);

  // Update status
  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (newStatus === currentStatus) return;

      startTransition(async () => {
        try {
          const response = await fetch(
            `/api/documents/${documentId}/status`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update status");
          }

          toast.success(
            `เปลี่ยนสถานะเป็น "${DOCUMENT_STATUS_LABELS[newStatus]}" สำเร็จ`
          );
          router.refresh();
        } catch (error) {
          console.error("Status update failed:", error);
          toast.error("ไม่สามารถเปลี่ยนสถานะได้");
        }
      });
    },
    [currentStatus, documentId, router]
  );

  return (
    <>
      {/* Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm print:hidden">
          <div className="flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-gray-700">
              {exportLabel || "กำลังสร้างไฟล์..."}
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:sticky md:bottom-0 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          {/* Left: Export Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="shrink-0"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJpg}
              disabled={isExporting}
              className="shrink-0"
            >
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">รูปภาพ</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isExporting}
              className="shrink-0"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">แชร์</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isExporting}
              className="shrink-0"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">พิมพ์</span>
            </Button>
          </div>

          {/* Right: Edit + Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="shrink-0"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">แก้ไข</span>
            </Button>

            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="shrink-0"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Badge
                      className={`${DOCUMENT_STATUS_COLORS[currentStatus]} text-xs pointer-events-none`}
                    >
                      {DOCUMENT_STATUS_LABELS[currentStatus]}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STATUS_OPTIONS.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={status === currentStatus}
                  >
                    <Badge
                      className={`${DOCUMENT_STATUS_COLORS[status]} text-xs pointer-events-none`}
                    >
                      {DOCUMENT_STATUS_LABELS[status]}
                    </Badge>
                    {status === currentStatus && (
                      <span className="ml-2 text-xs text-gray-400">
                        (ปัจจุบัน)
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}
