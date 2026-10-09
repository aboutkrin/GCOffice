"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

import { copyExpenses } from "@/actions/expense-actions";
import { formatBaht } from "@/lib/thai-currency";

import { Button } from "@/components/ui/button";
import { DecimalInput } from "@/components/ui/decimal-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  THAI_MONTHS,
  dateKey,
  monthKey,
  type ExpenseRow,
} from "./expense-utils";

interface ExpenseCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Last month's expenses (payroll-posted ones already left out) */
  source: ExpenseRow[];
  targetYear: number;
  targetMonth: number;
  categoryColor: (categoryId: string) => string;
}

export function ExpenseCopyDialog({
  open,
  onOpenChange,
  source,
  targetYear,
  targetMonth,
  categoryColor,
}: ExpenseCopyDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // The board remounts this dialog (new key) each time it opens, so these start fresh
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(source.map((e) => e.id))
  );
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(source.map((e) => [e.id, Number(e.amount)]))
  );

  const total = useMemo(
    () => source.filter((e) => selected.has(e.id)).reduce((s, e) => s + (amounts[e.id] ?? 0), 0),
    [source, selected, amounts]
  );

  const allChecked = source.length > 0 && selected.size === source.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCopy() {
    const items = source
      .filter((e) => selected.has(e.id))
      .map((e) => ({
        name: e.name,
        amount: amounts[e.id] ?? Number(e.amount),
        // Same day of month, clamped to the target month's last day
        expenseDate: monthKey(targetYear, targetMonth, Number(dateKey(e.expenseDate).slice(8, 10))),
        categoryId: e.categoryId,
        paymentMethod: e.paymentMethod,
        notes: e.notes ?? undefined,
      }));
    if (!items.length) return;

    startTransition(async () => {
      try {
        const { count } = await copyExpenses(items);
        toast.success(`คัดลอก ${count} รายการไปเดือน${THAI_MONTHS[targetMonth - 1]}แล้ว`);
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "คัดลอกไม่สำเร็จ");
      }
    });
  }

  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-4" />
            คัดลอกจากเดือน{THAI_MONTHS[prevMonth - 1]}
          </DialogTitle>
          <DialogDescription>
            เลือกรายการที่จ่ายซ้ำทุกเดือน แก้ยอดได้ก่อนคัดลอก วันที่จะเป็นวันเดียวกันของเดือน
            {THAI_MONTHS[targetMonth - 1]}
          </DialogDescription>
        </DialogHeader>

        {source.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            เดือน{THAI_MONTHS[prevMonth - 1]}ไม่มีค่าใช้จ่ายให้คัดลอก
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/40 px-5 py-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={allChecked}
                onChange={() =>
                  setSelected(allChecked ? new Set() : new Set(source.map((e) => e.id)))
                }
              />
              เลือกทั้งหมด ({selected.size}/{source.length})
            </label>
            {source.map((e) => {
              const checked = selected.has(e.id);
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 border-b px-5 py-2.5 last:border-b-0 ${
                    checked ? "" : "opacity-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={checked}
                    onChange={() => toggle(e.id)}
                    aria-label={e.name}
                  />
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor(e.categoryId) }}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => toggle(e.id)}
                  >
                    <div className="truncate text-sm font-medium">{e.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {e.category?.name} · วันที่ {Number(dateKey(e.expenseDate).slice(8, 10))}
                    </div>
                  </button>
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                      ฿
                    </span>
                    <DecimalInput
                      className="h-8 pl-6 text-right"
                      value={amounts[e.id] ?? 0}
                      onChange={(v) => setAmounts((a) => ({ ...a, [e.id]: v }))}
                      disabled={!checked}
                      aria-label={`ยอด ${e.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="items-center border-t px-5 py-4 sm:justify-between">
          <div className="text-sm text-muted-foreground">
            รวม <span className="font-semibold text-foreground">{formatBaht(total)}</span>
          </div>
          <Button onClick={handleCopy} disabled={isPending || selected.size === 0}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            คัดลอก {selected.size} รายการ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
