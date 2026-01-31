"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPathRef = useRef(pathname + searchParams.toString());

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    cleanup();
    setProgress(20);
    setVisible(true);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          cleanup();
          return prev;
        }
        return prev + (85 - prev) * 0.1;
      });
    }, 200);
  }, [cleanup]);

  const done = useCallback(() => {
    cleanup();
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, [cleanup]);

  // Detect navigation completion
  useEffect(() => {
    const newPath = pathname + searchParams.toString();
    if (newPath !== currentPathRef.current) {
      currentPathRef.current = newPath;
      done();
    }
  }, [pathname, searchParams, done]);

  // Listen for link clicks to detect navigation start
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external links, hash links, and downloads
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("target") === "_blank"
      ) {
        return;
      }

      // Skip if clicking the current page
      if (href === pathname || href === currentPathRef.current) return;

      start();
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname, start]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none">
      <div
        className={cn(
          "h-full bg-primary shadow-[0_0_8px_var(--color-primary)]",
          progress < 100
            ? "transition-[width] duration-200 ease-out"
            : "transition-all duration-300 ease-in-out opacity-0"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
