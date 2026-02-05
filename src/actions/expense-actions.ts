"use server";

import { prisma } from "@/lib/prisma";
import { expenseSchema, expenseCategorySchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";

async function ensureExpenseTables() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM expense_categories LIMIT 1`;
  } catch {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "expense_categories" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "sort_order" INTEGER NOT NULL DEFAULT 0,
          "status" "Status" NOT NULL DEFAULT 'ACTIVE',
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name")`
      );
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "expenses" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "amount" DECIMAL(12,2) NOT NULL,
          "expense_date" DATE NOT NULL,
          "category_id" TEXT NOT NULL,
          "notes" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses"("category_id")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses"("expense_date")`
      );
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey"
        FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
      `).catch(() => {});
    } catch {
      // Tables might already exist partially, continue anyway
    }
  }
}

export async function createExpense(data: unknown) {
  await ensureExpenseTables();
  const validated = expenseSchema.parse(data);

  const expense = await prisma.expense.create({
    data: {
      name: validated.name,
      amount: validated.amount,
      expenseDate: validated.expenseDate,
      categoryId: validated.categoryId,
      notes: validated.notes,
    },
  });

  revalidatePath("/expenses");
  return serialize(expense);
}

export async function updateExpense(id: string, data: unknown) {
  const validated = expenseSchema.parse(data);

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      name: validated.name,
      amount: validated.amount,
      expenseDate: validated.expenseDate,
      categoryId: validated.categoryId,
      notes: validated.notes,
    },
  });

  revalidatePath("/expenses");
  return serialize(expense);
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({
    where: { id },
  });
  revalidatePath("/expenses");
}

export async function createExpenseCategory(data: unknown) {
  await ensureExpenseTables();
  const validated = expenseCategorySchema.parse(data);

  const category = await prisma.expenseCategory.create({
    data: {
      name: validated.name,
    },
  });

  revalidatePath("/expenses");
  return { id: category.id, name: category.name, sortOrder: category.sortOrder, status: category.status };
}

export async function deleteExpenseCategory(id: string) {
  const existing = await prisma.expenseCategory.findUnique({
    where: { id },
    include: { _count: { select: { expenses: true } } },
  });

  if (!existing) throw new Error("ไม่พบหมวดหมู่");

  if (existing._count.expenses > 0) {
    throw new Error("ไม่สามารถลบหมวดหมู่ได้เนื่องจากมีค่าใช้จ่ายในหมวดหมู่นี้อยู่");
  }

  await prisma.expenseCategory.delete({ where: { id } });
  revalidatePath("/expenses");
}
