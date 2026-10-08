"use client";

/**
 * Renders PDF pages to JPEG files in the browser so a PDF proforma invoice
 * goes through the same image pipeline (and the same vision model) as a photo.
 */
export const MAX_PDF_PAGES = 6;

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export async function pdfToImages(
  file: File,
  options?: { maxPages?: number; targetWidth?: number }
): Promise<File[]> {
  // Legacy build: the modern one needs very recent JS (e.g. Map#getOrInsertComputed)
  // that older iPhones/Android browsers don't have yet
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const pageCount = Math.min(pdf.numPages, options?.maxPages ?? MAX_PDF_PAGES);
    const targetWidth = options?.targetWidth ?? 1800;
    const baseName = file.name.replace(/\.pdf$/i, "");
    const images: File[] = [];

    for (let n = 1; n <= pageCount; n++) {
      const page = await pdf.getPage(n);
      const unscaled = page.getViewport({ scale: 1 });
      // Enough pixels for small table text, capped so huge pages stay reasonable
      const scale = Math.min(4, Math.max(1, targetWidth / unscaled.width));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      page.cleanup();
      if (!blob) throw new Error("render failed");
      images.push(new File([blob], `${baseName}-p${n}.jpg`, { type: "image/jpeg" }));
    }
    return images;
  } finally {
    await pdf.destroy();
  }
}
