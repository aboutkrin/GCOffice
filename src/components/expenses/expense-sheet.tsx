"use client";

import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";

import { expenseSchema } from "@/lib/validators";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  createExpenseCategory,
} from "@/actions/expense-actions";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatBaht } from "@/lib/thai-currency";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/ui/decimal-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  addDaysKey,
  dateKey,
  formatAmount,
  todayKey,
  type ExpenseCategoryItem,
  type ExpenseRow,
  type ExpenseTemplate,
} from "./expense-utils";

interface ExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The expense being edited; null = add a new one */
  expense: ExpenseRow | null;
  categories: ExpenseCategoryItem[];
  onCategoryCreated: (category: ExpenseCategoryItem) => void;
  categoryUsage: Record<string, number>;
  templates: ExpenseTemplate[];
  defaultDate: string;
  defaultPaymentMethod: string;
  categoryColor: (categoryId: string) => string;
}

interface FormState {
  amount: number;
  name: string;
  categoryId: string;
  expenseDate: string;
  paymentMethod: string;
  notes: string;
}

const MOBILE_QUERY = "(max-width: 639px)";

function useIsMobile() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

export function ExpenseSheet({
  open,
  onOpenChange,
  expense,
  categories,
  onCategoryCreated,
  categoryUsage,
  templates,
  defaultDate,
  defaultPaymentMethod,
  categoryColor,
}: ExpenseSheetProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  // The board remounts this sheet (new key) each time it opens, so state starts fresh
  const [form, setForm] = useState<FormState>(() =>
    expense
      ? {
          amount: Number(expense.amount),
          name: expense.name,
          categoryId: expense.categoryId,
          expenseDate: dateKey(expense.expenseDate),
          paymentMethod: expense.paymentMethod,
          notes: expense.notes ?? "",
        }
      : emptyForm()
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showNotes, setShowNotes] = useState(!!expense?.notes);
  const [nameFocused, setNameFocused] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Bumped to remount the amount input (DecimalInput keeps its own text) and refocus it
  const [formKey, setFormKey] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);

  const isEdit = !!expense;
  const today = todayKey();

  function emptyForm(keep?: Partial<FormState>): FormState {
    return {
      amount: 0,
      name: "",
      categoryId: keep?.categoryId ?? "",
      expenseDate: keep?.expenseDate ?? defaultDate,
      paymentMethod: keep?.paymentMethod ?? defaultPaymentMethod,
      notes: "",
    };
  }


  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => (categoryUsage[b.id] ?? 0) - (categoryUsage[a.id] ?? 0)
      ),
    [categories, categoryUsage]
  );

  const suggestions = useMemo(() => {
    const q = form.name.trim().toLowerCase();
    const list = q
      ? templates.filter(
          (t) => t.name.toLowerCase().includes(q) && t.name.toLowerCase() !== q
        )
      : templates;
    return list.slice(0, 6);
  }, [form.name, templates]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function applyTemplate(t: ExpenseTemplate) {
    setForm((f) => ({
      ...f,
      name: t.name,
      categoryId: categories.some((c) => c.id === t.categoryId) ? t.categoryId : f.categoryId,
      paymentMethod: t.paymentMethod,
      amount: f.amount > 0 ? f.amount : t.amount,
    }));
    setErrors({});
    if (form.amount <= 0) setFormKey((k) => k + 1);
    setNameFocused(false);
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const category = await createExpenseCategory({ name });
      onCategoryCreated(category);
      set("categoryId", category.id);
      setNewCategoryName("");
      setAddingCategory(false);
      toast.success(`เพิ่มหมวด "${category.name}" แล้ว`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  }

  function submit(keepOpen: boolean) {
    const payload = {
      name: form.name.trim(),
      amount: form.amount,
      expenseDate: form.expenseDate,
      categoryId: form.categoryId,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim() || undefined,
    };
    const parsed = expenseSchema.safeParse(payload);
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        nextErrors[key] ??= issue.message;
      }
    }
    if (payload.amount <= 0) nextErrors.amount = "กรุณาใส่จำนวนเงิน";
    if (!payload.expenseDate) nextErrors.expenseDate = "กรุณาเลือกวันที่";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      if (nextErrors.amount) amountRef.current?.focus();
      return;
    }

    startTransition(async () => {
      try {
        if (expense) {
          await updateExpense(expense.id, payload);
          toast.success("บันทึกการแก้ไขแล้ว");
        } else {
          await createExpense(payload);
          toast.success(`เพิ่ม "${payload.name}" ฿${formatAmount(payload.amount)} แล้ว`);
        }
        router.refresh();
        if (keepOpen) {
          setForm(emptyForm(form));
          setShowNotes(false);
          setFormKey((k) => k + 1);
        } else {
          onOpenChange(false);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  function handleDelete() {
    if (!expense) return;
    startTransition(async () => {
      try {
        await deleteExpense(expense.id);
        toast.success("ลบค่าใช้จ่ายแล้ว");
        setConfirmDelete(false);
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
      }
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "gap-0 p-0",
            isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md"
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            amountRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit(false);
            }
          }}
        >
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{isEdit ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}</SheetTitle>
            <SheetDescription>
              {isEdit ? "แก้ไขแล้วกดบันทึก" : "ใส่ยอดเงิน ชื่อรายการ แล้วเลือกหมวด"}
            </SheetDescription>
          </SheetHeader>

          <form
            id="expense-sheet-form"
            className="flex-1 space-y-6 overflow-y-auto px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit(false);
            }}
          >
            {/* Amount */}
            <div
              className={cn(
                "rounded-2xl border bg-muted/40 px-4 py-5 text-center transition-colors focus-within:border-primary/60 focus-within:bg-muted/60",
                errors.amount && "border-destructive"
              )}
            >
              <div className="text-xs font-medium text-muted-foreground">จำนวนเงิน</div>
              <DecimalInput
                key={formKey}
                ref={amountRef}
                value={form.amount}
                onChange={(v) => set("amount", v)}
                placeholder="0.00"
                aria-label="จำนวนเงิน"
                className="mt-1 h-auto border-0 bg-transparent p-0 text-center text-4xl font-bold shadow-none focus-visible:ring-0 md:text-4xl dark:bg-transparent"
              />
              <div className="mt-1 h-4 text-xs text-muted-foreground">
                {form.amount > 0 ? formatBaht(form.amount) : "บาท"}
              </div>
              {errors.amount && (
                <p className="mt-1 text-xs text-destructive">{errors.amount}</p>
              )}
            </div>

            {/* Name + suggestions */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="expense-name">
                รายการ
              </label>
              <div className="relative">
                <Input
                  id="expense-name"
                  autoComplete="off"
                  placeholder="เช่น ค่าเช่าโกดัง, Ads Facebook"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  aria-invalid={!!errors.name}
                />
                {nameFocused && suggestions.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
                    <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">
                      {form.name.trim() ? "รายการที่เคยบันทึก" : "ใช้บ่อยล่าสุด"}
                    </div>
                    {suggestions.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyTemplate(t);
                        }}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: categoryColor(t.categoryId) }}
                        />
                        <span className="flex-1 truncate">{t.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {categoryName(t.categoryId)} · ฿{formatAmount(t.amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Category chips */}
            <div className="space-y-1.5">
              <div className="text-sm font-medium">หมวดหมู่</div>
              <div className="flex flex-wrap gap-2">
                {sortedCategories.map((cat) => {
                  const active = form.categoryId === cat.id;
                  const color = categoryColor(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => set("categoryId", cat.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "border-transparent text-white shadow-sm"
                          : "bg-background hover:bg-accent"
                      )}
                      style={active ? { backgroundColor: color } : undefined}
                    >
                      {active ? (
                        <Check className="size-3.5" />
                      ) : (
                        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                      )}
                      {cat.name}
                    </button>
                  );
                })}
                {addingCategory ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      className="h-8 w-40"
                      placeholder="ชื่อหมวดใหม่"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          setAddingCategory(false);
                        }
                      }}
                    />
                    <Button type="button" size="icon-sm" onClick={handleAddCategory}>
                      <Check className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setAddingCategory(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingCategory(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    หมวดใหม่
                  </button>
                )}
              </div>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <div className="text-sm font-medium">วันที่จ่าย</div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "วันนี้", value: today },
                  { label: "เมื่อวาน", value: addDaysKey(today, -1) },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => set("expenseDate", opt.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      form.expenseDate === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                <Input
                  type="date"
                  className="h-9 w-auto flex-1 min-w-[10rem]"
                  value={form.expenseDate}
                  onChange={(e) => set("expenseDate", e.target.value)}
                  aria-label="วันที่จ่าย"
                />
              </div>
              {errors.expenseDate && (
                <p className="text-xs text-destructive">{errors.expenseDate}</p>
              )}
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <div className="text-sm font-medium">จ่ายด้วย</div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-5">
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("paymentMethod", m)}
                    className={cn(
                      "rounded-lg px-1 py-1.5 text-sm whitespace-nowrap transition-all",
                      form.paymentMethod === m
                        ? "bg-background font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            {showNotes ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="expense-notes">
                  หมายเหตุ
                </label>
                <Textarea
                  id="expense-notes"
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
                เพิ่มหมายเหตุ
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 border-t bg-background px-5 py-4">
            {isEdit ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                >
                  <Trash2 className="size-4" />
                  ลบ
                </Button>
                <Button
                  type="submit"
                  form="expense-sheet-form"
                  className="ml-auto min-w-28"
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  บันทึก
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => submit(true)}
                  disabled={isPending}
                >
                  บันทึกและเพิ่มต่อ
                </Button>
                <Button
                  type="submit"
                  form="expense-sheet-form"
                  className="flex-1"
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  บันทึก
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบค่าใช้จ่ายนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {expense?.name} ฿{formatAmount(Number(expense?.amount ?? 0))} —
              ลบแล้วกู้คืนไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
