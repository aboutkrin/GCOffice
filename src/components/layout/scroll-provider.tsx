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

  return (
    <ScrollHiddenContext value={hidden}>
      {children}
    </ScrollHiddenContext>
  );
}
