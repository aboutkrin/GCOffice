"use server";

import { prisma } from "@/lib/prisma";
import { expenseSchema, expenseCategorySchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createExpense(data: unknown) {
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
  const validated = expenseCategorySchema.parse(data);

  const category = await prisma.expenseCategory.create({
    data: {
      name: validated.name,
    },
  });

  revalidatePath("/expenses");
  return category;
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
