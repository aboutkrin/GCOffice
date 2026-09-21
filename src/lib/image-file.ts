"use client";

import {
  MAX_UPLOAD_BYTES,
  getExtension,
  isHeicLike,
  resolveImageMimeType,
} from "@/lib/image-formats";
import { UploadError } from "@/lib/upload-errors";

/** Stages reported while the file is being made upload-ready. */
export type PrepareStage = "converting" | "compressing";

/** Longest edge kept after downscaling (iPhone photos are ~4000px wide). */
const MAX_DIMENSION = 2000;
/** Target size after compression. */
const MAX_COMPRESSED_MB = 2;
/** Files at or below this size are uploaded untouched (logos, QR codes). */
const SKIP_COMPRESSION_BYTES = 300 * 1024;

/** ISO-BMFF brands that identify a HEIC/HEIF still image. */
const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "heif",
  "mif1",
  "msf1",
]);

/**
 * Sniff the ISO-BMFF `ftyp` box, for the common case where a `.heic` from an
 * iPhone arrives with an empty or `application/octet-stream` MIME type.
 */
async function sniffHeic(file: File): Promise<boolean> {
  try {
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (header.length < 12) return false;
    const ascii = (start: number, end: number) =>
      String.fromCharCode(...header.slice(start, end));
    if (ascii(4, 8) !== "ftyp") return false;
    return HEIF_BRANDS.has(ascii(8, 12).toLowerCase());
  } catch {
    return false;
  }
}

/**
 * True when the picked file looks like an image we can handle. Deliberately
 * more permissive than `file.type.startsWith("image/")`: Android and Windows
 * pickers often report no MIME type at all for HEIC files from an iPhone.
 */
export function isImageCandidate(file: File): boolean {
  return resolveImageMimeType(file.name, file.type) !== null;
}

function replaceExtension(fileName: string, extension: string): string {
  const current = getExtension(fileName);
  const base = current ? fileName.slice(0, -(current.length + 1)) : fileName;
  return `${base || "image"}.${extension}`;
}

/**
 * Make a picked file safe to upload and to render afterwards:
 * HEIC/HEIF from iPhone is converted to JPEG, and large photos are downscaled
 * and compressed. Small files (logos, PromptPay QR codes) are left untouched so
 * transparency and crispness are preserved.
 *
 * Always rejects with an {@link UploadError} carrying a Thai message.
 */
export async function prepareImageFile(
  file: File,
  onStage?: (stage: PrepareStage) => void
): Promise<File> {
  const mimeType = resolveImageMimeType(file.name, file.type);
  if (!mimeType) throw new UploadError("INVALID_TYPE");

  let prepared = file;
  let preparedType = mimeType;

  if (isHeicLike(file.name, file.type) || (await sniffHeic(file))) {
    onStage?.("converting");
    try {
      const { heicTo } = await import("heic-to");
      const jpegBlob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.92,
      });
      prepared = new File([jpegBlob], replaceExtension(file.name, "jpg"), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
      preparedType = "image/jpeg";
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      throw new UploadError("CONVERT_FAILED");
    }
  }

  // GIFs would lose their animation and AVIF is already small — leave both be.
  const compressible =
    preparedType !== "image/gif" && preparedType !== "image/avif";

  if (compressible && prepared.size > SKIP_COMPRESSION_BYTES) {
    onStage?.("compressing");
    try {
      const { default: imageCompression } = await import(
        "browser-image-compression"
      );
      // Keep PNG/WebP in their own format so transparency survives.
      const targetType =
        preparedType === "image/png" || preparedType === "image/webp"
          ? preparedType
          : "image/jpeg";

      const compressed = await imageCompression(prepared, {
        maxWidthOrHeight: MAX_DIMENSION,
        maxSizeMB: MAX_COMPRESSED_MB,
        fileType: targetType,
        initialQuality: 0.85,
        // Avoid the library's default CDN-hosted web worker script.
        useWebWorker: false,
      });

      if (compressed.size > 0 && compressed.size < prepared.size) {
        prepared = new File(
          [compressed],
          replaceExtension(prepared.name, targetType === "image/png" ? "png" : targetType === "image/webp" ? "webp" : "jpg"),
          { type: targetType, lastModified: prepared.lastModified }
        );
      }
    } catch (error) {
      // Compression is an optimisation — fall back to the uncompressed file.
      console.error("Image compression failed:", error);
    }
  }

  if (prepared.size > MAX_UPLOAD_BYTES) throw new UploadError("TOO_LARGE");

  return prepared;
}
