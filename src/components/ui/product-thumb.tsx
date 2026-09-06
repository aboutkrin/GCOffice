"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  /** Square size in px. Defaults to 40. */
  size?: number;
  className?: string;
  /** Fallback shown when there is no image, or the image fails to load. */
  fallback?: "text" | "icon";
}

/**
 * Thumbnail for product/company/line-item images. Renders a plain <img>
 * instead of next/image — these are small, remote (Supabase / the website
 * catalog), and don't benefit from the optimizer, which is why next/image
 * was silently failing to render them.
 */
export function ProductThumb({
  src,
  alt,
  size = 40,
  className,
  fallback = "text",
}: ProductThumbProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={cn(
          "rounded bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0",
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallback === "icon" ? (
          <Package className="size-5" />
        ) : (
          "N/A"
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={cn("rounded object-cover shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}
