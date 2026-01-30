"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { uploadImage, deleteImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket: "product-images" | "company-logos";
  folder?: string;
}

export function ImageUpload({
  value,
  onChange,
  bucket,
  folder = "uploads",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        return;
      }

      setIsUploading(true);
      try {
        const url = await uploadImage(bucket, file, folder);
        onChange(url);
      } catch (error: any) {
        toast.error(error?.message ?? "อัปโหลดรูปภาพไม่สำเร็จ");
      } finally {
        setIsUploading(false);
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

  if (value) {
    return (
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Uploaded image"
          className="size-40 rounded-lg border object-cover"
        />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex size-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary",
          isDragging && "border-primary bg-primary/5 text-primary",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        {isUploading ? (
          <Loader2 className="size-8 animate-spin" />
        ) : (
          <ImagePlus className="size-8" />
        )}
        <span className="text-xs">
          {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}
        </span>
      </button>
    </>
  );
}
