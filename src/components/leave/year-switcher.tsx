import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Prev / next calendar-year links (leave years reset on 1 January). */
export function YearSwitcher({ year, hrefFor }: { year: number; hrefFor: (year: number) => string }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={hrefFor(year - 1)} aria-label="ปีก่อนหน้า">
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <span className="min-w-24 text-center font-medium">ปี {year + 543}</span>
      <Button variant="outline" size="icon" asChild>
        <Link href={hrefFor(year + 1)} aria-label="ปีถัดไป">
          <ChevronRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
