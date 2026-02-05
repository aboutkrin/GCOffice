"use server";

import { prisma } from "@/lib/prisma";
import { expenseSchema, expenseCategorySchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";

async function ensureExpenseTables() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM expense_categories LIMIT 1`;
    // Tables exist — ensure payment_method column was added (migration may not have run)
    try {
      await prisma.$queryRaw`SELECT payment_method FROM expenses LIMIT 1`;
    } catch {
      // Column missing — add PaymentMethod enum and column
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
            CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CREDIT_CARD', 'PROMPTPAY', 'OTHER');
          END IF;
        END $$
      `).catch(() => {});
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER'`
      ).catch(() => {});
    }
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
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
            CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CREDIT_CARD', 'PROMPTPAY', 'OTHER');
          END IF;
        END $$
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "expenses" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "amount" DECIMAL(12,2) NOT NULL,
          "expense_date" DATE NOT NULL,
          "category_id" TEXT NOT NULL,
          "payment_method" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER',
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
  try {
    await ensureExpenseTables();
    const validated = expenseSchema.parse(data);

    const expense = await prisma.expense.create({
      data: {
        name: validated.name,
        amount: validated.amount,
        expenseDate: validated.expenseDate,
        categoryId: validated.categoryId,
        paymentMethod: validated.paymentMethod,
        notes: validated.notes,
      },
    });

    revalidatePath("/expenses");
    return serialize(expense);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถบันทึกค่าใช้จ่ายได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function updateExpense(id: string, data: unknown) {
  try {
    const validated = expenseSchema.parse(data);

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        name: validated.name,
        amount: validated.amount,
        expenseDate: validated.expenseDate,
        categoryId: validated.categoryId,
        paymentMethod: validated.paymentMethod,
        notes: validated.notes,
      },
    });

    revalidatePath("/expenses");
    return serialize(expense);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถบันทึกค่าใช้จ่ายได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function deleteExpense(id: string) {
  try {
    await prisma.expense.delete({
      where: { id },
    });
    revalidatePath("/expenses");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถลบค่าใช้จ่ายได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function createExpenseCategory(data: unknown) {
  try {
    await ensureExpenseTables();
    const validated = expenseCategorySchema.parse(data);

    const category = await prisma.expenseCategory.create({
      data: {
        name: validated.name,
      },
    });

    revalidatePath("/expenses");
    return { id: category.id, name: category.name, sortOrder: category.sortOrder, status: category.status };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถเพิ่มหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function deleteExpenseCategory(id: string) {
  try {
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
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "ไม่สามารถลบหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}
