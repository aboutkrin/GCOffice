"use client";

/** Slices taller than this (height ÷ width) are cut; vision models shrink a long image until its text is unreadable. */
const MAX_ASPECT = 1.6;
/** Height of one slice as a multiple of the width */
const SLICE_ASPECT = 1.2;
/** Share of a slice repeated at the top of the next one, so no table row is cut in half */
const OVERLAP = 0.12;
const MAX_SLICES = 6;

/**
 * Cuts a long screenshot (e.g. a whole PI exported as one tall image) into
 * overlapping top-to-bottom JPEG slices. Images that are not tall come back
 * unchanged as a single element.
 */
export async function sliceTallImage(file: File): Promise<File[]> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return [file];
  }
  try {
    const { width, height } = bitmap;
    if (width === 0 || height / width <= MAX_ASPECT) return [file];

    let sliceH = Math.round(width * SLICE_ASPECT);
    let overlap = Math.round(sliceH * OVERLAP);
    let count = Math.ceil((height - overlap) / (sliceH - overlap));
    if (count > MAX_SLICES) {
      // Very long image: fewer, taller slices
      sliceH = Math.ceil(height / (MAX_SLICES * (1 - OVERLAP) + OVERLAP));
      overlap = Math.round(sliceH * OVERLAP);
      count = MAX_SLICES;
    }
    const step = sliceH - overlap;
    const base = file.name.replace(/\.[^.]+$/, "") || "pi";

    const slices: File[] = [];
    for (let i = 0; i < count; i++) {
      const top = Math.min(i * step, Math.max(0, height - sliceH));
      const h = Math.min(sliceH, height - top);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return [file];
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, h);
      ctx.drawImage(bitmap, 0, top, width, h, 0, 0, width, h);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) return [file];
      slices.push(new File([blob], `${base}-part${i + 1}.jpg`, { type: "image/jpeg" }));
    }
    return slices;
  } finally {
    bitmap.close();
  }
}
