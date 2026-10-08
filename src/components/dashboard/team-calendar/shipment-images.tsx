"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { uploadImage } from "@/lib/upload";
import { isImageCandidate, prepareImageFile } from "@/lib/image-file";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/image-formats";
import { UPLOAD_ERROR_MESSAGES, uploadErrorMessage } from "@/lib/upload-errors";
import { CHINA_SHIPMENT_MAX_IMAGES } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Photos of the goods in a China shipment. Several files can be picked at once
 * (phone gallery); each is converted/compressed like product photos, then uploaded.
 * Removing a photo only drops it from the list — the file stays in storage until
 * the form is saved, so cancelling the dialog never loses a saved photo.
 */
export function ShipmentImagesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const remaining = CHINA_SHIPMENT_MAX_IMAGES - value.length;

  async function handleFiles(files: File[]) {
    const images = files.filter(isImageCandidate);
    if (images.length < files.length) toast.error(UPLOAD_ERROR_MESSAGES.INVALID_TYPE);
    if (images.length > remaining) {
      toast.error(`ใส่รูปได้ไม่เกิน ${CHINA_SHIPMENT_MAX_IMAGES} รูป`);
    }
    const batch = images.slice(0, Math.max(remaining, 0));
    if (batch.length === 0) return;

    setUploading(batch.length);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const prepared = await prepareImageFile(file);
          return await uploadImage("product-images", prepared, "china-shipments");
        } catch (error) {
          toast.error(uploadErrorMessage(error));
          return null;
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
    const urls = results.filter((u): u is string => !!u);
    if (urls.length > 0) onChange([...value, ...urls]);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > 0) handleFiles(files);
        }}
      />
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative">
            <button type="button" onClick={() => setViewIndex(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`รูปที่ ${i + 1}`}
                className="size-16 rounded-md border object-cover"
              />
            </button>
            <button
              type="button"
              aria-label="ลบรูป"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-0.5 text-white shadow-sm hover:bg-destructive/90"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div
            key={`uploading-${i}`}
            className="flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground"
          >
            <Loader2 className="size-5 animate-spin" />
          </div>
        ))}
        {remaining > uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ImagePlus className="size-5" />
            <span className="text-[10px]">เพิ่มรูป</span>
          </button>
        )}
      </div>
      <ImageViewer urls={value} index={viewIndex} onIndexChange={setViewIndex} />
    </div>
  );
}

/** Read-only thumbnails; tapping one opens it full-size. */
export function ShipmentImageThumbs({
  urls,
  size = "md",
}: {
  urls: string[];
  size?: "sm" | "md";
}) {
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  if (urls.length === 0) return null;
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, i) => (
          <button key={url} type="button" onClick={() => setViewIndex(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`รูปที่ ${i + 1}`}
              loading="lazy"
              className={cn(
                "rounded-md border object-cover hover:opacity-80",
                size === "sm" ? "size-10" : "size-16"
              )}
            />
          </button>
        ))}
      </div>
      <ImageViewer urls={urls} index={viewIndex} onIndexChange={setViewIndex} />
    </>
  );
}

function ImageViewer({
  urls,
  index,
  onIndexChange,
}: {
  urls: string[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const open = index !== null && index < urls.length;
  const go = (delta: number) =>
    index !== null && onIndexChange((index + delta + urls.length) % urls.length);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogContent className="max-w-[95vw] p-2 sm:max-w-3xl">
        <DialogTitle className="sr-only">รูปสินค้า</DialogTitle>
        {open && (
          <div className="relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[index]}
              alt={`รูปที่ ${index + 1}`}
              className="max-h-[80vh] w-auto rounded-md object-contain"
            />
            {urls.length > 1 && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute left-1 h-8 w-8 rounded-full opacity-80"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-1 h-8 w-8 rounded-full opacity-80"
                  onClick={() => go(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="absolute bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  {index + 1} / {urls.length}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
