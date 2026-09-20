"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { uploadImage, deleteImage } from "@/lib/upload";
import {
  isImageCandidate,
  prepareImageFile,
  type PrepareStage,
} from "@/lib/image-file";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/image-formats";
import { UPLOAD_ERROR_MESSAGES, uploadErrorMessage } from "@/lib/upload-errors";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<PrepareStage | "uploading", string> = {
  converting: "กำลังแปลงรูปภาพ...",
  compressing: "กำลังย่อรูปภาพ...",
  uploading: "กำลังอัปโหลด...",
};

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket: "product-images" | "company-logos" | "signatures";
  folder?: string;
  /** Read-only: show the current image without upload/remove controls. */
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  bucket,
  folder = "uploads",
  disabled = false,
}: ImageUploadProps) {
  const [stage, setStage] = useState<PrepareStage | "uploading" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isImageCandidate(file)) {
        toast.error(UPLOAD_ERROR_MESSAGES.INVALID_TYPE);
        return;
      }

      setStage("uploading");
      try {
        // Converts iPhone HEIC to JPEG and downsizes large photos;
        // reports its own "converting"/"compressing" stages as it goes.
        const prepared = await prepareImageFile(file, setStage);
        setStage("uploading");
        const url = await uploadImage(bucket, prepared, folder);
        onChange(url);
      } catch (error) {
        toast.error(uploadErrorMessage(error));
      } finally {
        setStage(null);
      }
    },
    [bucket, folder, onChange]
  );

  const handleRemove = useCallback(async () => {
    if (value) {
      try {
        await deleteImage(bucket, value);
      } catch {
        // Ignore delete errors — the image may already be gone
      }
      onChange("");
    }
  }, [bucket, value, onChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const isBusy = stage !== null;

  if (value) {
    return (
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Uploaded image"
          className={cn(
            "size-40 rounded-lg border object-cover",
            disabled && "opacity-70"
          )}
        />
        {!disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={isBusy || disabled}
        onClick={() => inputRef.current?.click()}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        className={cn(
          "flex size-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary",
          isDragging && "border-primary bg-primary/5 text-primary",
          isBusy && "pointer-events-none opacity-60",
          disabled && "cursor-not-allowed opacity-60 hover:border-inherit hover:text-muted-foreground"
        )}
      >
        {isBusy ? (
          <Loader2 className="size-8 animate-spin" />
        ) : (
          <ImagePlus className="size-8" />
        )}
        <span className="text-xs">
          {stage ? STAGE_LABELS[stage] : "อัปโหลดรูปภาพ"}
        </span>
      </button>
    </>
  );
}
