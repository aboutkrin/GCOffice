import html2canvas from "html2canvas-pro";

// Preload all images in element and convert to data URLs for html2canvas compatibility
async function preloadImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const promises = Array.from(images).map(async (img) => {
    if (!img.src || img.src.startsWith("data:")) return;

    try {
      // Try direct fetch first
      let response = await fetch(img.src, { mode: "cors" }).catch(() => null);

      // If CORS fails, use proxy for external images
      if (!response || !response.ok) {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(img.src)}`;
        response = await fetch(proxyUrl);
      }

      if (response && response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        img.src = dataUrl;
      }
    } catch (error) {
      console.warn("Failed to preload image:", img.src, error);
    }
  });

  await Promise.all(promises);
}

// Capture a single element to a JPG canvas
async function captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });
}

// Convert canvas to blob
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

// Download a blob as a file
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToJpg(
  element: HTMLElement,
  filename: string,
  preOpenedWindow?: Window | null
): Promise<Blob | null> {
  // Preload images and convert to data URLs
  await preloadImages(element);

  // Find individual document preview pages within the container
  const pages = element.querySelectorAll<HTMLElement>('[id="document-preview"]');

  // Multiple pages (e.g. VAT receipt with ต้นฉบับ + สำเนา): export each as separate A4 JPG
  if (pages.length > 1) {
    if (preOpenedWindow) preOpenedWindow.close();

    let firstBlob: Blob | null = null;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const canvas = await captureElement(page);
      const blob = await canvasToBlob(canvas);
      if (blob) {
        const suffix = i === 0 ? "-ต้นฉบับ" : "-สำเนา";
        downloadBlob(blob, `${filename}${suffix}.jpg`);
        if (i === 0) firstBlob = blob;
      }
    }
    return firstBlob;
  }

  // Single page: export as before
  const canvas = await captureElement(element);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);

          if (preOpenedWindow) {
            // iOS Safari: navigate pre-opened window to the blob URL
            // iOS doesn't support <a download> so we open in a new tab instead
            preOpenedWindow.location.href = url;
            // Don't revoke URL — the new window needs it
          } else {
            const link = document.createElement("a");
            link.href = url;
            link.download = `${filename}.jpg`;
            link.click();
            URL.revokeObjectURL(url);
          }
          resolve(blob);
        } else {
          if (preOpenedWindow) preOpenedWindow.close();
          resolve(null);
        }
      },
      "image/jpeg",
      0.92
    );
  });
}
