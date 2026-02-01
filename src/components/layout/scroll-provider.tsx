"use client";

import { useEffect } from "react";

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  // Fix iOS Safari white-space bug on keyboard dismiss.
  // When the virtual keyboard closes, the visual viewport grows but the
  // scroll container can be left scrolled past its valid range, creating
  // a large blank area at the bottom.
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const onResize = () => {
      const main = document.querySelector("main");
      if (!main) return;

      requestAnimationFrame(() => {
        const maxScroll = main.scrollHeight - main.clientHeight;
        if (maxScroll >= 0 && main.scrollTop > maxScroll) {
          main.scrollTop = maxScroll;
        }
      });
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  return <>{children}</>;
}
