import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export async function exportToPdf(
  element: HTMLElement,
  filename: string,
  preOpenedWindow?: Window | null
): Promise<void> {
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
