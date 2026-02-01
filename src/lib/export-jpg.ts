import html2canvas from "html2canvas-pro";

export async function exportToJpg(
  element: HTMLElement,
  filename: string,
  preOpenedWindow?: Window | null
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
