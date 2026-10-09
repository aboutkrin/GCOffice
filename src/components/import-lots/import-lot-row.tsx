"use client";

import { useRouter } from "next/navigation";

import { TableRow } from "@/components/ui/table";

/**
 * A table row that opens `href` when clicked anywhere. Replaces a stretched
 * link (`after:absolute after:inset-0` on a `relative` <tr>): browsers that
 * don't treat <tr> as a containing block stretched every row's overlay over
 * the whole table, so every click opened the last row.
 */
export function ImportLotRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={(e) => {
        // Let real links inside the row (and modified clicks on them) work normally.
        if ((e.target as HTMLElement).closest("a")) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
