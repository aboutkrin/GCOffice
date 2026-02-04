import html2canvas from "html2canvas-pro";

// Preload all images in element and convert to data URLs for html2canvas compatibility
async function preloadImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const promises = Array.from(images).map(async (img) => {
    if (!img.src || img.src.startsWith("data:")) return;

    try {
      const response = await fetch(img.src, { mode: "cors" });
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      img.src = dataUrl;
    } catch (error) {
      console.warn("Failed to preload image:", img.src, error);
    }
  });

  await Promise.all(promises);
}

export async function exportToJpg(
  element: HTMLElement,
  filename: string,
  preOpenedWindow?: Window | null
): Promise<Blob | null> {
  // Preload images and convert to data URLs
  await preloadImages(element);

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

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
