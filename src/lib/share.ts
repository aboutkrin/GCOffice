"use client";

export async function shareFile(data: {
  title: string;
  text?: string;
  files?: File[];
}): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;

  try {
    if (data.files && navigator.canShare?.({ files: data.files })) {
      await navigator.share(data);
      return true;
    }
    await navigator.share({ title: data.title, text: data.text });
    return true;
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      console.error("Share failed:", err);
    }
    return false;
  }
}
