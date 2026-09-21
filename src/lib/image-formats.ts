/**
 * Image format constants shared by the upload route and the client picker.
 * Pure data + string helpers — safe to import from both server and client code.
 */

/** Hard cap enforced by the API route (the client compresses well below this). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** MIME types accepted by `/api/upload`, mapped to the stored file extension. */
export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/heic-sequence": "heic",
  "image/heif-sequence": "heic",
};

/** Extensions accepted when the browser reports no (or a bogus) MIME type. */
export const ALLOWED_IMAGE_EXTENSIONS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heic",
  hif: "image/heic",
};

/** `accept` attribute for file inputs — iPhone HEIC needs the explicit extensions. */
export const IMAGE_ACCEPT_ATTRIBUTE = "image/*,.heic,.heif,.hif";

export function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function isHeicLike(fileName: string, mimeType: string): boolean {
  const type = mimeType.toLowerCase();
  if (type.startsWith("image/heic") || type.startsWith("image/heif")) return true;
  const extension = getExtension(fileName);
  return extension === "heic" || extension === "heif" || extension === "hif";
}

/**
 * Resolve the effective MIME type of an upload.
 *
 * Browsers frequently report `""` or `application/octet-stream` for `.heic`
 * files, so the extension is used as the fallback source of truth.
 * Returns `null` when the file is not a supported image.
 */
export function resolveImageMimeType(
  fileName: string,
  mimeType: string
): string | null {
  const type = mimeType.toLowerCase();
  if (ALLOWED_IMAGE_MIME_TYPES[type]) return type;

  const extension = getExtension(fileName);
  return ALLOWED_IMAGE_EXTENSIONS[extension] ?? null;
}

/** Extension to store the object under, derived from the resolved MIME type. */
export function extensionForMimeType(mimeType: string): string {
  return ALLOWED_IMAGE_MIME_TYPES[mimeType.toLowerCase()] ?? "jpg";
}
