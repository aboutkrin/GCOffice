import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

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

export async function exportToPdf(
  element: HTMLElement,
  filename: string,
  preOpenedWindow?: Window | null
): Promise<void> {
  // Preload images and convert to data URLs
  await preloadImages(element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = pdfWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  // Multi-page support
  let position = 0;
  let heightLeft = scaledHeight;

  pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight);
    heightLeft -= pdfHeight;
  }

  if (preOpenedWindow) {
    // iOS Safari: open PDF blob in pre-opened window
    // iOS doesn't support <a download>, so we open in native PDF viewer instead
    const pdfBlob = pdf.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    preOpenedWindow.location.href = url;
  } else {
    pdf.save(`${filename}.pdf`);
  }
}
