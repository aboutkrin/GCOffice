import { notFound, redirect } from "next/navigation";

import { getExpenseById } from "@/data/expenses";

interface EditExpensePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

// Expenses are edited from the sheet on /expenses; open it on the expense's month.
export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params;
  const expense = await getExpenseById(id);

  if (!expense) {
    notFound();
  }

  const date = new Date(expense.expenseDate);
  redirect(
    `/expenses?month=${date.getUTCMonth() + 1}&year=${date.getUTCFullYear()}&edit=${id}`
  );
}
