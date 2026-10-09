"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Lock,
  Pencil,
  Plus,
  Receipt,
  Search,
  X,
} from "lucide-react";

import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate, THAI_MONTHS_SHORT } from "@/lib/thai-date";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { ExpenseSheet } from "./expense-sheet";
import { ExpenseCopyDialog } from "./expense-copy-dialog";
import {
  THAI_MONTHS,
  buildCategoryColors,
  dateKey,
  daysInMonth,
  monthKey,
  todayKey,
  type ExpenseCategoryItem,
  type ExpenseRow,
  type ExpenseTemplate,
} from "./expense-utils";

interface ExpenseBoardProps {
  expenses: ExpenseRow[];
  /** Same-length period before this one (previous month, or previous year for "ทั้งปี") */
  previousExpenses: ExpenseRow[];
  categories: ExpenseCategoryItem[];
  templates: ExpenseTemplate[];
  categoryUsage: Record<string, number>;
  /** undefined = whole year */
  month?: number;
  year: number;
  currentYear: number;
  currentMonth: number;
}

export function ExpenseBoard({
  expenses,
  previousExpenses,
  categories: initialCategories,
  templates,
  categoryUsage,
  month,
  year,
  currentYear,
  currentMonth,
}: ExpenseBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  // Remount the sheet / copy dialog on every open so their state starts fresh
  const [sheetKey, setSheetKey] = useState(0);
  const [copyKey, setCopyKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  useEffect(() => setCategories(initialCategories), [initialCategories]);
  const categoryColor = useMemo(() => buildCategoryColors(categories), [categories]);
  useEffect(() => setCategoryFilter(null), [month, year]);

  // ?add=1 / ?edit=<id> (old /expenses/new and /expenses/[id]/edit links) open the sheet
  useEffect(() => {
    const add = searchParams.get("add");
    const editId = searchParams.get("edit");
    if (!add && !editId) return;
    if (editId) {
      const target = expenses.find((e) => e.id === editId && !e.payroll);
      if (target) openEdit(target);
    } else {
      openAdd();
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("add");
    params.delete("edit");
    router.replace(`/expenses${params.size ? `?${params}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Press "N" anywhere on the page to add an expense
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      openAdd();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openAdd() {
    setEditing(null);
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  function openEdit(expense: ExpenseRow) {
    setEditing(expense);
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  function openCopy() {
    setCopyKey((k) => k + 1);
    setCopyOpen(true);
  }

  function navigate(nextMonth: number | "all", nextYear: number) {
    const params = new URLSearchParams();
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    router.push(`/expenses?${params}`);
  }

  function step(delta: number) {
    if (!month) return navigate("all", year + delta);
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    navigate(m, y);
  }

  const isCurrentPeriod = year === currentYear && (!month || month === currentMonth);
  const periodLabel = month
    ? `${THAI_MONTHS[month - 1]} ${year + 543}`
    : `ทั้งปี ${year + 543}`;
  const previousLabel = month
    ? THAI_MONTHS[(month + 10) % 12]
    : `ปี ${year + 542}`;

  // New expenses default to today in the current month, else the viewed month's last day
  const defaultDate =
    month && !(year === currentYear && month === currentMonth)
      ? monthKey(year, month, daysInMonth(year, month))
      : todayKey();
  const lastPaymentMethod = templates[0]?.paymentMethod ?? "TRANSFER";

  const total = useMemo(() => sum(expenses), [expenses]);
  const previousTotal = useMemo(() => sum(previousExpenses), [previousExpenses]);
  const change = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;

  const breakdown = useMemo(() => {
    const map = new Map<string, { id: string; name: string; amount: number; count: number }>();
    for (const e of expenses) {
      const cur = map.get(e.categoryId) ?? {
        id: e.categoryId,
        name: e.category?.name ?? "-",
        amount: 0,
        count: 0,
      };
      cur.amount += Number(e.amount);
      cur.count += 1;
      map.set(e.categoryId, cur);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter && e.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return [e.name, e.notes, e.category?.name].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      );
    });
  }, [expenses, search, categoryFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>();
    for (const e of filtered) {
      const key = dateKey(e.expenseDate);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const copySource = useMemo(
    () => (month ? previousExpenses.filter((e) => !e.payroll) : []),
    [month, previousExpenses]
  );

  const today = todayKey();
  const filterCategory = breakdown.find((b) => b.id === categoryFilter);

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ค่าใช้จ่ายรายเดือน</h1>
          <p className="text-sm text-muted-foreground">
            บันทึกรายจ่ายของบริษัท
            <span className="hidden md:inline">
              {" "}
              กด <kbd className="rounded border bg-muted px-1 text-xs">N</kbd> เพื่อเพิ่มรายการได้ทันที
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/expenses/summary?month=${month ?? "all"}&year=${year}`}>
              <FileText className="size-4" />
              ดูใบสรุป
            </Link>
          </Button>
          <Button onClick={openAdd} className="hidden md:inline-flex">
            <Plus className="size-4" />
            เพิ่มค่าใช้จ่าย
          </Button>
        </div>
      </div>

      {/* Period switcher */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-xl border bg-card p-1 shadow-xs">
          <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="ก่อนหน้า">
            <ChevronLeft className="size-4" />
          </Button>
          <Popover
            open={pickerOpen}
            onOpenChange={(o) => {
              setPickerOpen(o);
              if (o) setPickerYear(year);
            }}
          >
            <PopoverTrigger asChild>
              <button className="flex min-w-40 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-accent">
                <CalendarDays className="size-4 text-muted-foreground" />
                {periodLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="center">
              <div className="mb-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPickerYear((y) => y - 1)}
                  aria-label="ปีก่อน"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-semibold">พ.ศ. {pickerYear + 543}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPickerYear((y) => y + 1)}
                  aria-label="ปีถัดไป"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {THAI_MONTHS.map((name, i) => {
                  const active = month === i + 1 && pickerYear === year;
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        setPickerOpen(false);
                        navigate(i + 1, pickerYear);
                      }}
                      className={cn(
                        "rounded-md px-2 py-2 text-sm hover:bg-accent",
                        active && "bg-primary text-primary-foreground hover:bg-primary",
                        !active &&
                          pickerYear === currentYear &&
                          i + 1 === currentMonth &&
                          "font-semibold text-primary"
                      )}
                    >
                      {THAI_MONTHS_SHORT[i]}
                    </button>
                  );
                })}
              </div>
              <Button
                variant={!month && pickerYear === year ? "default" : "outline"}
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setPickerOpen(false);
                  navigate("all", pickerYear);
                }}
              >
                ดูทั้งปี {pickerYear + 543}
              </Button>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="ถัดไป">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        {!isCurrentPeriod && (
          <Button variant="ghost" size="sm" onClick={() => navigate(currentMonth, currentYear)}>
            กลับเดือนนี้
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 rounded-2xl border bg-gradient-to-br sm:col-span-1 from-primary to-primary/80 p-5 text-primary-foreground shadow-sm">
          <div className="text-sm opacity-80">ยอดรวม{month ? "เดือนนี้" : "ทั้งปี"}</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">{formatBaht(total)}</div>
          <div className="mt-1 text-xs opacity-70">{periodLabel}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="text-sm text-muted-foreground">เทียบกับ{previousLabel}</div>
          {change === null ? (
            <div className="mt-1 text-2xl font-semibold text-muted-foreground">—</div>
          ) : (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-2xl font-semibold",
                change > 0 ? "text-red-600" : "text-emerald-600"
              )}
            >
              {change > 0 ? (
                <ArrowUpRight className="size-5" />
              ) : (
                <ArrowDownRight className="size-5" />
              )}
              {Math.abs(change).toFixed(change !== 0 && Math.abs(change) < 10 ? 1 : 0)}%
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground">
            {previousLabel} {formatBaht(previousTotal)}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="text-sm text-muted-foreground">จำนวนรายการ</div>
          <div className="mt-1 text-2xl font-semibold">{expenses.length} รายการ</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {breakdown[0]
              ? `จ่ายมากสุด: ${breakdown[0].name}`
              : "ยังไม่มีรายการ"}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {breakdown.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">แยกตามหมวด</div>
            <div className="text-xs text-muted-foreground">แตะหมวดเพื่อกรอง</div>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {breakdown.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "h-full transition-opacity",
                  categoryFilter && categoryFilter !== b.id && "opacity-25"
                )}
                style={{
                  width: `${total > 0 ? (b.amount / total) * 100 : 0}%`,
                  backgroundColor: categoryColor(b.id),
                }}
                title={`${b.name} ${formatBaht(b.amount)}`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {breakdown.map((b) => {
              const active = categoryFilter === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setCategoryFilter(active ? null : b.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
                    active ? "border-foreground bg-accent" : "hover:bg-accent",
                    categoryFilter && !active && "opacity-60"
                  )}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: categoryColor(b.id) }}
                  />
                  <span>{b.name}</span>
                  <span className="font-medium">{formatBaht(b.amount)}</span>
                  <span className="text-xs text-muted-foreground">
                    {total > 0 ? Math.round((b.amount / total) * 100) : 0}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหารายการ หมายเหตุ หรือหมวด..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {filterCategory && (
          <button
            onClick={() => setCategoryFilter(null)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: categoryColor(filterCategory.id) }}
            />
            {filterCategory.name}
            <X className="size-3.5" />
          </button>
        )}
        {month && (
          <Button variant="outline" className="sm:ml-auto" onClick={openCopy}>
            <Copy className="size-4" />
            คัดลอกจากเดือนก่อน
          </Button>
        )}
      </div>

      {/* List grouped by day */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <div className="mb-3 rounded-full bg-muted p-4">
            <Receipt className="size-7 text-muted-foreground" />
          </div>
          {expenses.length === 0 ? (
            <>
              <div className="font-medium">ยังไม่มีค่าใช้จ่าย{month ? "เดือนนี้" : "ปีนี้"}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                เพิ่มรายการแรก หรือคัดลอกรายการที่จ่ายประจำจากเดือนก่อน
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={openAdd}>
                  <Plus className="size-4" />
                  เพิ่มค่าใช้จ่าย
                </Button>
                {month && copySource.length > 0 && (
                  <Button variant="outline" onClick={openCopy}>
                    <Copy className="size-4" />
                    คัดลอกจากเดือน{previousLabel} ({copySource.length})
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">ไม่พบรายการที่ค้นหา</div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([day, items]) => (
            <div key={day} className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-sm">
                <span className="font-medium">
                  {day === today ? "วันนี้ · " : ""}
                  {formatThaiDate(new Date(`${day}T00:00:00Z`), "short")}
                </span>
                <span className="text-muted-foreground">{formatBaht(sum(items))}</span>
              </div>
              <ul className="divide-y">
                {items.map((e) => (
                  <ExpenseItem
                    key={e.id}
                    expense={e}
                    color={categoryColor(e.categoryId)}
                    onEdit={() => openEdit(e)}
                  />
                ))}
              </ul>
            </div>
          ))}
          {(search || categoryFilter) && (
            <div className="text-right text-sm text-muted-foreground">
              รวมที่แสดง {filtered.length} รายการ ·{" "}
              <span className="font-semibold text-foreground">{formatBaht(sum(filtered))}</span>
            </div>
          )}
        </div>
      )}

      {/* Mobile add button */}
      <Button
        onClick={openAdd}
        size="lg"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40 h-12 rounded-full px-5 shadow-lg md:hidden"
      >
        <Plus className="size-5" />
        เพิ่ม
      </Button>

      <ExpenseSheet
        key={`sheet-${sheetKey}`}
        categoryColor={categoryColor}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        expense={editing}
        categories={categories}
        onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
        categoryUsage={categoryUsage}
        templates={templates}
        defaultDate={defaultDate}
        defaultPaymentMethod={lastPaymentMethod}
      />

      {month && (
        <ExpenseCopyDialog
          key={`copy-${copyKey}`}
          categoryColor={categoryColor}
          open={copyOpen}
          onOpenChange={setCopyOpen}
          source={copySource}
          targetYear={year}
          targetMonth={month}
        />
      )}
    </div>
  );
}

function ExpenseItem({
  expense,
  color,
  onEdit,
}: {
  expense: ExpenseRow;
  color: string;
  onEdit: () => void;
}) {
  const locked = !!expense.payroll;

  const content = (
    <>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        {locked ? <Lock className="size-4" /> : (expense.category?.name ?? "?").slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{expense.name}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{expense.category?.name ?? "-"}</span>
          <span>·</span>
          <span>{PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? "-"}</span>
          {locked && (
            <>
              <span>·</span>
              <span className="text-primary">จากสลิปเงินเดือน</span>
            </>
          )}
          {expense.notes && (
            <span className="hidden truncate sm:inline sm:max-w-xs">— {expense.notes}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right font-semibold tabular-nums">
        {formatBaht(Number(expense.amount))}
      </div>
      {!locked && (
        <Pencil className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  );

  const className =
    "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50";

  return (
    <li>
      {locked ? (
        <Link
          href={`/payroll/${expense.payroll!.id}`}
          className={className}
          title="แก้ไขได้ที่หน้าเงินเดือน"
        >
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onEdit} className={className}>
          {content}
        </button>
      )}
    </li>
  );
}

function sum(list: ExpenseRow[]) {
  return list.reduce((s, e) => s + Number(e.amount), 0);
}

