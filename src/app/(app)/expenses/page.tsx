import Link from "next/link";
import { Plus } from "lucide-react";

import { getExpenses, getExpenseCategories } from "@/data/expenses";
import { getThaiNow } from "@/lib/thai-date";
import { Button } from "@/components/ui/button";
import { ExpenseTable } from "@/components/expenses/expense-table";

export const dynamic = "force-dynamic";

interface ExpensesPageProps {
  searchParams: Promise<{
    search?: string;
    month?: string;
    year?: string;
    categoryId?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
  const thaiNow = getThaiNow();
  const currentYear = params.year
    ? parseInt(params.year, 10)
    : thaiNow.year;
  const currentMonth = params.month === "all"
    ? undefined
    : params.month
      ? parseInt(params.month, 10)
      : thaiNow.month;

  const [expenses, categories] = await Promise.all([
    getExpenses({
      search: params.search,
      categoryId: params.categoryId,
      month: currentMonth,
      year: currentYear,
    }),
    getExpenseCategories(),
  ]);

  const totalAmount = expenses.reduce(
    (sum: number, e: any) => sum + Number(e.amount),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ค่าใช้จ่ายรายเดือน</h1>
          <p className="text-muted-foreground text-sm">
            จัดการค่าใช้จ่ายรายเดือนทั้งหมด
          </p>
        </div>
        <Button asChild>
          <Link href="/expenses/new">
            <Plus className="size-4" />
            เพิ่มค่าใช้จ่าย
          </Link>
        </Button>
      </div>

      <ExpenseTable
        expenses={expenses}
        categories={categories}
        totalAmount={totalAmount}
        currentMonth={currentMonth}
        currentYear={currentYear}
        currentCategoryId={params.categoryId}
      />
    </div>
  );
}
