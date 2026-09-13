import { cn } from "@/lib/utils";

interface AvailabilityBadgeProps {
  onHand: number;
  reserved: number;
  available: number;
  /** Compact: just "พร้อมขาย N" with a color tint. Full: คงเหลือ/จอง/พร้อมขาย breakdown. */
  variant?: "compact" | "full";
  className?: string;
}

export function AvailabilityBadge({
  onHand,
  reserved,
  available,
  variant = "compact",
  className,
}: AvailabilityBadgeProps) {
  const tone =
    available <= 0
      ? "text-red-600"
      : available <= onHand && reserved > 0 && available < onHand * 0.3
        ? "text-amber-600"
        : "text-muted-foreground";

  if (variant === "compact") {
    return (
      <span className={cn("text-xs", tone, className)}>
        พร้อมขาย {available}
        {reserved > 0 && <span className="text-muted-foreground"> (จอง {reserved})</span>}
      </span>
    );
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      คงเหลือ {onHand} · จอง {reserved} ·{" "}
      <span className={tone}>พร้อมขาย {available}</span>
    </span>
  );
}
