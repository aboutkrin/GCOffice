"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScanLine, Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CameraScanner } from "./camera-scanner";

export interface ScanInputHandle {
  /** Reopen the camera sheet (e.g. after a scanned item's quantity is confirmed). */
  openCamera: () => void;
}

interface ScanInputProps {
  /** Called with the raw scanned/typed code. Return a promise if async; a thrown/rejected value shows as an inline error. */
  onScan: (code: string, meta: { fromCamera: boolean }) => Promise<void> | void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  ref?: React.Ref<ScanInputHandle>;
}

const DUPLICATE_WINDOW_MS = 1200;
const FAST_INPUT_IDLE_MS = 120;

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 80);
  } catch {
    // best-effort only
  }
}

/**
 * Shared scan input serving both a USB/Bluetooth keyboard-wedge scanner (a
 * focused text input, committed on Enter or fast-input idle) and a phone
 * camera (opened in a sheet, lazy-loaded only when used).
 */
export function ScanInput({ onScan, placeholder, autoFocus = true, disabled, ref }: ScanInputProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommit = useRef<{ code: string; at: number } | null>(null);

  useImperativeHandle(ref, () => ({
    openCamera: () => setCameraOpen(true),
  }));

  useEffect(() => {
    if (!autoFocus) return;
    const refocus = () => {
      if (document.activeElement === document.body || document.activeElement === null) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener("visibilitychange", refocus);
    inputRef.current?.focus();
    return () => document.removeEventListener("visibilitychange", refocus);
  }, [autoFocus]);

  // Re-focus once re-enabled — e.g. after a quantity prompt (rendered by the
  // parent while `disabled`) is confirmed or cancelled, so the next
  // keyboard-wedge scan can go straight into the input with no extra tap.
  useEffect(() => {
    if (!disabled && autoFocus) {
      inputRef.current?.focus();
    }
  }, [disabled, autoFocus]);

  const commit = useCallback(
    async (code: string, opts?: { forceDuplicate?: boolean; fromCamera?: boolean }) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const now = Date.now();
      const isDuplicate =
        !opts?.forceDuplicate &&
        lastCommit.current &&
        lastCommit.current.code === trimmed &&
        now - lastCommit.current.at < DUPLICATE_WINDOW_MS;

      if (isDuplicate) {
        setError(`สแกนซ้ำ "${trimmed}" — กดอีกครั้งเพื่อเพิ่ม`);
        lastCommit.current = null; // next identical scan within the window is accepted
        setValue("");
        return;
      }

      lastCommit.current = { code: trimmed, at: now };
      setError(null);
      setBusy(true);
      setValue("");
      try {
        await onScan(trimmed, { fromCamera: !!opts?.fromCamera });
        beep();
        if (navigator.vibrate) navigator.vibrate(40);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [onScan]
  );

  // The camera must close the instant a code is decoded, regardless of what
  // resolving it later turns out to do (succeed, throw, whatever) — closing
  // can't wait on that async result, or a failing scan leaves the camera
  // open forever, re-detecting the same label every frame. Held in a ref so
  // the function identity handed to CameraScanner never changes — otherwise
  // its capture effect (keyed on identity) restarts the camera stream on
  // every render `commit` causes, fighting the close.
  const handleDetectRef = useRef((code: string) => {
    setCameraOpen(false);
    commit(code, { fromCamera: true });
  });
  handleDetectRef.current = (code: string) => {
    setCameraOpen(false);
    commit(code, { fromCamera: true });
  };
  const handleCameraDetect = useCallback((code: string) => {
    handleDetectRef.current(code);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    // Tolerates scanners configured without an Enter terminator.
    if (next.length >= 4) {
      idleTimer.current = setTimeout(() => commit(next), FAST_INPUT_IDLE_MS);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idleTimer.current) clearTimeout(idleTimer.current);
      commit(value);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Re-focus shortly after, unless the user tapped another input/button.
              setTimeout(() => {
                if (autoFocus && document.activeElement === document.body) {
                  inputRef.current?.focus();
                }
              }, 50);
            }}
            placeholder={placeholder ?? "สแกนหรือพิมพ์รหัสสินค้า..."}
            className="pl-9 font-mono"
            disabled={disabled || busy}
            autoComplete="off"
          />
          {busy && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCameraOpen(true)}
          disabled={disabled}
          title="สแกนด้วยกล้อง"
        >
          <Camera className="size-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <CameraScanner
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetect={handleCameraDetect}
      />
    </div>
  );
}
