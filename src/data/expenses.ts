import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

async function ensureExpenseTables() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM expense_categories LIMIT 1`;
    return true;
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
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");

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
        );
        CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses"("category_id");
        CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses"("expense_date");

        DO $$ BEGIN
          ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey"
            FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at") VALUES
          ('exp_cat_sample', 'ค่าสั่งตัวอย่าง', 1, NOW()),
          ('exp_cat_fb_ads', 'ค่ายิงแอด Facebook', 2, NOW()),
          ('exp_cat_ig_ads', 'ค่ายิงแอด Instagram', 3, NOW()),
          ('exp_cat_tiktok_ads', 'ค่ายิงแอด TikTok', 4, NOW()),
          ('exp_cat_line_oa', 'ค่าตั้งชื่อ LINE OA', 5, NOW()),
          ('exp_cat_shipping', 'ค่าขนส่ง', 6, NOW()),
          ('exp_cat_packaging', 'ค่าบรรจุภัณฑ์', 7, NOW()),
          ('exp_cat_other', 'อื่นๆ', 99, NOW())
        ON CONFLICT ("id") DO NOTHING;
      `);
      return true;
    } catch {
      return false;
    }
  }
}

export async function getExpenses(params?: {
  search?: string;
  categoryId?: string;
  month?: number;
  year?: number;
}) {
  await ensureExpenseTables();

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
  await ensureExpenseTables();

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  });
  return serialize(expense);
}

export async function getExpenseCategories() {
  await ensureExpenseTables();

  return prisma.expenseCategory.findMany({
    where: { status: "ACTIVE" },
    include: { _count: { select: { expenses: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getExpenseMonthlySummary(year: number) {
  await ensureExpenseTables();

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
