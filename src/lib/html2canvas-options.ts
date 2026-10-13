import type { Options } from "html2canvas-pro";

// html2canvas measures text in a cloned iframe and then redraws it on a canvas.
// If the web font isn't ready, the iframe is narrower than the A4 page, or the
// mobile browser inflates small text (text-size-adjust), the measured and drawn
// text differ and Thai text comes out overlapping. These helpers keep both
// exporters consistent.

const CAPTURE_WINDOW_WIDTH = 1280;

export async function waitForFonts(): Promise<void> {
  try {
    await document.fonts.ready;
    // Make sure the weights used on the page are actually loaded
    await Promise.all(
      ["300", "400", "500", "600", "700"].map((w) =>
        document.fonts.load(`${w} 12px Sarabun`, "กขค ABC 123").catch(() => [])
      )
    );
    await document.fonts.ready;
  } catch {
    // fonts API unavailable — carry on
  }
}

export function captureOptions(scale: number): Partial<Options> {
  return {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: CAPTURE_WINDOW_WIDTH,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      const style = clonedDoc.createElement("style");
      style.textContent =
        "html,body{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important;}" +
        "*{-webkit-font-smoothing:auto!important;font-kerning:none!important;text-rendering:optimizeSpeed!important;font-variant-ligatures:none!important;}";
      clonedDoc.head.appendChild(style);
    },
  };
}
