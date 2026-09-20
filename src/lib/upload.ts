"use client";

import { UploadError, type UploadErrorCode } from "@/lib/upload-errors";

export async function uploadImage(
  bucket: "product-images" | "company-logos" | "signatures",
  file: File,
  folder: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  formData.append("folder", folder);

  let res: Response;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    // Offline, DNS failure, request aborted by the browser
    console.error("Upload request failed:", error);
    throw new UploadError("NETWORK");
  }

  // A platform-level error (e.g. a 413 from the edge) returns HTML, not JSON
  let data: { url?: string; error?: string; code?: UploadErrorCode };
  try {
    data = await res.json();
  } catch {
    throw new UploadError(res.status === 413 ? "TOO_LARGE" : "NETWORK");
  }

  if (!res.ok || !data.url) {
    throw new UploadError(data.code ?? "UNKNOWN");
  }

  return data.url;
}

export async function deleteImage(
  bucket: string,
  url: string
): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const path = url.split(`/storage/v1/object/public/${bucket}/`)[1];
  if (path) {
    await supabase.storage.from(bucket).remove([path]);
  }
}
