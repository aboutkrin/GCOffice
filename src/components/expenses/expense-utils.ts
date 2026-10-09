export { THAI_MONTHS } from "@/lib/thai-date";

export interface ExpenseCategoryItem {
  id: string;
  name: string;
}

export interface ExpenseRow {
  id: string;
  name: string;
  amount: number | string;
  /** Serialized `@db.Date` — "YYYY-MM-DDT00:00:00.000Z" */
  expenseDate: string;
  categoryId: string;
  category?: ExpenseCategoryItem | null;
  paymentMethod: string;
  notes?: string | null;
  payroll?: { id: string } | null;
}

export interface ExpenseTemplate {
  name: string;
  amount: number;
  categoryId: string;
  paymentMethod: string;
}


const CATEGORY_COLORS = [
  "#3b82f6",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#eab308",
  "#06b6d4",
  "#ef4444",
  "#84cc16",
  "#6366f1",
];

/**
 * Colour per category (no DB field). Categories come in sortOrder, so the n-th category always
 * gets the n-th colour; unknown ids fall back to a hash.
 */
export function buildCategoryColors(categories: ExpenseCategoryItem[]) {
  const map = new Map(
    categories.map((c, i) => [c.id, CATEGORY_COLORS[i % CATEGORY_COLORS.length]])
  );
  return (id: string): string => {
    const known = map.get(id);
    if (known) return known;
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
  };
}

/** Today in Bangkok as "YYYY-MM-DD". */
export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dateKey(value: string | Date): string {
  return (typeof value === "string" ? value : value.toISOString()).slice(0, 10);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthKey(year: number, month: number, day: number): string {
  const d = Math.min(day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Plain number with thousands separators, e.g. 12,500 or 1,234.50 */
export function formatAmount(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
