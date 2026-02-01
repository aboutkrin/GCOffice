"use client";

import { useEffect, useRef } from "react";

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const lastVVHeight = useRef<number>(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    lastVVHeight.current = vv.height;

    // Clamp scroll positions after iOS Safari keyboard opens/closes.
    // iOS can scroll both the <main> container AND the window itself
    // (even past overflow:hidden), so we need to reset both.
    const fixScroll = () => {
      // Reset any document-level scroll that iOS forced
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const main = document.querySelector("main");
      if (!main) return;

      const maxScroll = main.scrollHeight - main.clientHeight;
      if (maxScroll >= 0 && main.scrollTop > maxScroll) {
        main.scrollTop = maxScroll;
      }
    };

    // Run fixScroll across several frames so the layout fully settles.
    const fixScrollDelayed = () => {
      requestAnimationFrame(() => {
        fixScroll();
        requestAnimationFrame(fixScroll);
      });
    };

    const onViewportResize = () => {
      const grew = vv.height > lastVVHeight.current;
      lastVVHeight.current = vv.height;
      // The viewport growing means the keyboard just closed
      if (grew) {
        fixScrollDelayed();
      }
    };

    // focusout fires when an input loses focus (keyboard closing)
    const onFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        // Small delay lets iOS finish its scroll/viewport adjustments
        setTimeout(fixScrollDelayed, 120);
      }
    };

    vv.addEventListener("resize", onViewportResize);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      vv.removeEventListener("resize", onViewportResize);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return <>{children}</>;
}
