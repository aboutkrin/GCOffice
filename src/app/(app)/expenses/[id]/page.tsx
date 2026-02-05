import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getExpenseById, getExpenseCategories } from "@/data/expenses";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expenses/expense-form";

interface EditExpensePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params;
  const [expense, categories] = await Promise.all([
    getExpenseById(id),
    getExpenseCategories(),
  ]);

  if (!expense) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขค่าใช้จ่าย</h1>
          <p className="text-muted-foreground text-sm">{expense.name}</p>
        </div>
      </div>

      <ExpenseForm initialData={expense} categories={categories} />
    </div>
  );
}
