"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

const ScrollHiddenContext = createContext(false);

export function useScrollHidden() {
  return useContext(ScrollHiddenContext);
}

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const onScroll = () => {
      const y = main.scrollTop;
      const delta = y - lastScrollY.current;

      // Ignore tiny scrolls to prevent jitter
      if (Math.abs(delta) < 5) return;

      if (delta > 0 && y > 56) {
        setHidden(true);
      } else if (delta < 0) {
        setHidden(false);
      }

      lastScrollY.current = y;
    };

    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <ScrollHiddenContext value={hidden}>
      {children}
    </ScrollHiddenContext>
  );
}
