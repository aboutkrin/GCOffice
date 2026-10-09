import {
  getExpenses,
  getExpenseCategories,
  getExpenseQuickData,
} from "@/data/expenses";
import { getThaiNow } from "@/lib/thai-date";
import { ExpenseBoard } from "@/components/expenses/expense-board";
import type { ExpenseRow } from "@/components/expenses/expense-utils";

export const dynamic = "force-dynamic";

interface ExpensesPageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
  const thaiNow = getThaiNow();
  const year = params.year ? parseInt(params.year, 10) || thaiNow.year : thaiNow.year;
  const parsedMonth = params.month ? parseInt(params.month, 10) : thaiNow.month;
  const month =
    params.month === "all" || !(parsedMonth >= 1 && parsedMonth <= 12)
      ? undefined
      : parsedMonth;

  // The period before this one: last month, or last year when viewing a whole year
  const previous = month
    ? month === 1
      ? { month: 12, year: year - 1 }
      : { month: month - 1, year }
    : { month: undefined, year: year - 1 };

  const [expenses, previousExpenses, categories, quick] = await Promise.all([
    getExpenses({ month, year }),
    getExpenses(previous),
    getExpenseCategories(),
    getExpenseQuickData(),
  ]);

  return (
    <ExpenseBoard
      // serialize() has turned Decimal/Date into number/string
      expenses={expenses as unknown as ExpenseRow[]}
      previousExpenses={previousExpenses as unknown as ExpenseRow[]}
      categories={categories}
      templates={quick.templates}
      categoryUsage={quick.categoryUsage}
      month={month}
      year={year}
      currentYear={thaiNow.year}
      currentMonth={thaiNow.month}
    />
  );
}
