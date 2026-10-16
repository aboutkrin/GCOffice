"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2 } from "lucide-react";

import { getDocumentForShare } from "@/actions/document-actions";
import { DocumentPreview, type DocumentData } from "@/components/preview/document-preview";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// The preview lays itself out at A4 width (210mm ≈ 794 CSS px); the thumbnail
// is that page scaled down, so it looks like the real sheet.
const A4_WIDTH_PX = (210 * 96) / 25.4;
const A4_RATIO = 297 / 210;

const cache = new Map<string, Promise<DocumentData>>();

function loadDocument(id: string) {
  let p = cache.get(id);
  if (!p) {
    // The share payload is the same shape the preview pages pass (serialized Prisma row).
    p = getDocumentForShare(id) as unknown as Promise<DocumentData>;
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

function useDocumentData(id: string, enabled: boolean) {
  const [data, setData] = useState<DocumentData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadDocument(id)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id, enabled]);
  return { data, failed };
}

/**
 * A small picture of the quotation (the real preview, scaled down to a thumbnail).
 * Tapping it opens the full-size preview in a dialog, like the China shipment
 * photos. Used wherever a pickup appointment shows its quotation.
 */
export function QuotationThumb({
  documentId,
  documentNumber,
  width = 56,
  className,
}: {
  documentId: string;
  documentNumber?: string | null;
  /** Thumbnail width in px; the height follows the A4 ratio. */
  width?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data, failed } = useDocumentData(documentId, true);
  const scale = width / A4_WIDTH_PX;
  const height = Math.round(width * A4_RATIO);
  const label = `ใบเสนอราคา ${documentNumber ?? ""}`.trim();

  return (
    <>
      <button
        type="button"
        title={`ดู${label}`}
        aria-label={`ดู${label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-sm border bg-white shadow-sm transition-opacity hover:opacity-80",
          className
        )}
        style={{ width, height }}
      >
        {data ? (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 origin-top-left"
            style={{ width: A4_WIDTH_PX, transform: `scale(${scale})` }}
          >
            <DocumentPreview document={data} />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {failed ? <FileText className="size-5" /> : <Loader2 className="size-4 animate-spin" />}
          </div>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[95vw] gap-2 p-2 sm:max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 px-1 pr-8">
            <DialogTitle className="text-sm font-medium">{label}</DialogTitle>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={`/quotations/${documentId}`}>
                <ExternalLink className="size-3.5" />
                เปิดใบเสนอราคา
              </Link>
            </Button>
          </div>
          <div className="max-h-[80vh] overflow-auto rounded-md bg-gray-100 p-2 sm:p-4">
            {data ? (
              <DocumentPreview document={data} />
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                {failed ? "โหลดใบเสนอราคาไม่สำเร็จ" : <Loader2 className="size-5 animate-spin" />}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
