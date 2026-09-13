"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CameraScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetect: (code: string) => void;
}

type DetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

/**
 * Camera-based QR scanner. Uses the native BarcodeDetector API when available
 * (Chrome/Android — zero extra download); otherwise lazy-loads the
 * barcode-detector ponyfill (zxing-wasm), which is the only path on iOS
 * Safari. The wasm asset is served from /public/wasm (see src/app/sw.ts) so
 * it never fetches from a CDN — required for the offline PWA and any CSP.
 */
export function CameraScanner({ open, onOpenChange, onDetect }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<DetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectedRef = useRef<{ code: string; at: number } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      setStatus("loading");
      setErrorMessage(null);

      try {
        // Prefer the native BarcodeDetector when it can actually decode QR codes.
        const w = window as unknown as {
          BarcodeDetector?: { new (opts: { formats: string[] }): DetectorLike; getSupportedFormats: () => Promise<string[]> };
        };
        if (w.BarcodeDetector) {
          const formats = await w.BarcodeDetector.getSupportedFormats();
          if (formats.includes("qr_code")) {
            detectorRef.current = new w.BarcodeDetector({ formats: ["qr_code"] });
          }
        }

        if (!detectorRef.current) {
          const { BarcodeDetector, setZXingModuleOverrides } = await import("barcode-detector/ponyfill");
          setZXingModuleOverrides({
            locateFile: (path: string) => (path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : path),
          });
          detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] }) as unknown as DetectorLike;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ready");
        loop();
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "กรุณาอนุญาตให้ใช้กล้องเพื่อสแกน"
            : "ไม่สามารถเปิดกล้องได้ กรุณาพิมพ์รหัสแทน"
        );
      }
    }

    function loop() {
      if (cancelled || !videoRef.current || !detectorRef.current) return;
      const video = videoRef.current;
      if (video.readyState >= 2) {
        detectorRef.current
          .detect(video)
          .then((codes) => {
            if (cancelled || codes.length === 0) return;
            const value = codes[0].rawValue;
            const now = Date.now();
            const last = lastDetectedRef.current;
            if (last && last.code === value && now - last.at < 1200) {
              // still within the input component's own dedupe window; skip re-emitting every frame
              return;
            }
            lastDetectedRef.current = { code: value, at: now };
            onDetect(value);
          })
          .catch(() => {
            // transient decode errors are expected on out-of-focus frames
          });
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      detectorRef.current = null;
    };
  }, [open, onDetect]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>สแกนด้วยกล้อง</SheetTitle>
        </SheetHeader>
        <div className="relative flex-1 overflow-hidden rounded-lg bg-black mx-4 mb-4">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">กำลังเปิดกล้อง...</p>
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white p-6 text-center">
              <AlertCircle className="size-6" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
          {status === "ready" && (
            <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
