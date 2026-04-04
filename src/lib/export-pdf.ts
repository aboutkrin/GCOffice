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

  // Find individual document pages within the container
  const pages = element.querySelectorAll<HTMLElement>("[data-document-page]");

  if (pages.length > 0) {
    // Render each document page as a separate PDF page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Force A4 dimensions on each page for capture
      const origWidth = page.style.width;
      const origMaxWidth = page.style.maxWidth;
      const origMinHeight = page.style.minHeight;
      const origPadding = page.style.padding;
      page.style.width = "210mm";
      page.style.maxWidth = "none";
      page.style.minHeight = "297mm";
      page.style.padding = "2rem";

      // Wait for reflow
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Restore original styles
      page.style.width = origWidth;
      page.style.maxWidth = origMaxWidth;
      page.style.minHeight = origMinHeight;
      page.style.padding = origPadding;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      if (i > 0) {
        pdf.addPage();
      }

      // If the page content fits in one A4 page, render it as-is
      // Otherwise, scale it to fit within one A4 page
      if (scaledHeight <= pdfHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, scaledHeight);
      } else {
        // Scale down to fit within one A4 page
        const fitRatio = pdfHeight / scaledHeight;
        const fitWidth = pdfWidth * fitRatio;
        const offsetX = (pdfWidth - fitWidth) / 2;
        pdf.addImage(imgData, "JPEG", offsetX, 0, fitWidth, pdfHeight);
      }
    }
  } else {
    // Fallback: no data-document-page found, use legacy single-canvas approach
    const canvas = await html2canvas(element, {
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
