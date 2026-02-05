import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

let tablesCreated = false;

async function ensureExpenseTables() {
  if (tablesCreated) return;

  try {
    // Check if table exists with a simple query
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
    tablesCreated = true;
  } catch {
    // Tables don't exist yet - create them one statement at a time
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

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name")
      `);

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

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses"("category_id")
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses"("expense_date")
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey"
        FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
      `).catch(() => {});

      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_sample', 'ค่าสั่งตัวอย่าง', 1, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_sample')
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_fb_ads', 'ค่ายิงแอด Facebook', 2, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_fb_ads')
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_ig_ads', 'ค่ายิงแอด Instagram', 3, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_ig_ads')
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_tiktok_ads', 'ค่ายิงแอด TikTok', 4, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_tiktok_ads')
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_line_oa', 'ค่าตั้งชื่อ LINE OA', 5, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_line_oa')
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_shipping', 'ค่าขนส่ง', 6, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_shipping')
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_packaging', 'ค่าบรรจุภัณฑ์', 7, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_packaging')
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at")
        SELECT 'exp_cat_other', 'อื่นๆ', 99, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "expense_categories" WHERE "id" = 'exp_cat_other')
      `);

      tablesCreated = true;
    } catch {
      // Table creation failed - queries will fail gracefully below
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

  try {
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
  } catch {
    return [];
  }
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

  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
    });
    return serialize(categories);
  } catch {
    return [];
  }
}

export async function getExpenseMonthlySummary(year: number) {
  await ensureExpenseTables();

  try {
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
  } catch {
    return [];
  }
}
