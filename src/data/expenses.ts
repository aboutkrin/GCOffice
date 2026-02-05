import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getExpenses(params?: {
  search?: string;
  categoryId?: string;
  month?: number;
  year?: number;
}) {
  const where: any = {};

  if (params?.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { notes: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params?.month && params?.year) {
    const startDate = new Date(Date.UTC(params.year, params.month - 1, 1));
    const endDate = new Date(Date.UTC(params.year, params.month, 1));
    where.expenseDate = {
      gte: startDate,
      lt: endDate,
    };
  } else if (params?.year) {
    const startDate = new Date(Date.UTC(params.year, 0, 1));
    const endDate = new Date(Date.UTC(params.year + 1, 0, 1));
    where.expenseDate = {
      gte: startDate,
      lt: endDate,
    };
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { expenseDate: "desc" },
  });

  return serialize(expenses);
}

export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  });
  return serialize(expense);
}

export async function getExpenseCategories() {
  return prisma.expenseCategory.findMany({
    where: { status: "ACTIVE" },
    include: { _count: { select: { expenses: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getExpenseMonthlySummary(year: number) {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year + 1, 0, 1));

  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: { category: true },
    orderBy: { expenseDate: "asc" },
  });

  return serialize(expenses);
}
