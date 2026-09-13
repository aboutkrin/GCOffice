"use server";

import QRCode from "qrcode";

/** Server-side QR generation as data-URL PNGs — no client bundle, no CORS/network fetch at print/export time. */
export async function generateLabelQrCodesAction(codes: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(codes)];
  const entries = await Promise.all(
    unique.map(async (code) => {
      const dataUrl = await QRCode.toDataURL(code, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 512,
      });
      return [code, dataUrl] as const;
    })
  );
  return Object.fromEntries(entries);
}
