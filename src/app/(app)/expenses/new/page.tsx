import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getExpenseCategories } from "@/data/expenses";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/expenses/expense-form";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const categories = await getExpenseCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expenses">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มค่าใช้จ่าย</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลค่าใช้จ่ายด้านล่าง
          </p>
        </div>
      </div>

      <ExpenseForm categories={categories} />
    </div>
  );
}
