import html2canvas from "html2canvas-pro";

export async function exportToJpg(
  element: HTMLElement,
  filename: string
): Promise<Blob | null> {
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
          const link = document.createElement("a");
          link.href = url;
          link.download = `${filename}.jpg`;
          link.click();
          URL.revokeObjectURL(url);
          resolve(blob);
        } else {
          resolve(null);
        }
      },
      "image/jpeg",
      0.92
    );
  });
}
