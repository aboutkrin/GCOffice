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

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Check for multiple document-preview pages (e.g. ต้นฉบับ + สำเนา)
  const pages = element.querySelectorAll<HTMLElement>('[id="document-preview"]');

  if (pages.length > 1) {
    // Multi-page: capture each page separately as its own A4 page
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Scale to fit exactly one A4 page (each document-preview is one A4 page)
      const widthRatio = pdfWidth / imgWidth;
      const heightRatio = pdfHeight / imgHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // Center on the page
      const xOffset = (pdfWidth - scaledWidth) / 2;
      pdf.addImage(imgData, "JPEG", xOffset, 0, scaledWidth, scaledHeight);
    }
  } else {
    // Single page: capture the document-preview element (A4 sized) instead of the outer container
    const target = pages.length === 1 ? pages[0] : element;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

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
  }

  if (preOpenedWindow) {
    // iOS Safari: open PDF blob in pre-opened window
    const pdfBlob = pdf.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    preOpenedWindow.location.href = url;
  } else {
    pdf.save(`${filename}.pdf`);
  }
}
