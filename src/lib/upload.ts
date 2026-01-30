"use client";

export async function uploadImage(
  bucket: "product-images" | "company-logos",
  file: File,
  folder: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
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
