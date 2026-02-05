-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "category_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default expense categories
INSERT INTO "expense_categories" ("id", "name", "sort_order", "updated_at") VALUES
    ('exp_cat_sample', 'ค่าสั่งตัวอย่าง', 1, NOW()),
    ('exp_cat_fb_ads', 'ค่ายิงแอด Facebook', 2, NOW()),
    ('exp_cat_ig_ads', 'ค่ายิงแอด Instagram', 3, NOW()),
    ('exp_cat_tiktok_ads', 'ค่ายิงแอด TikTok', 4, NOW()),
    ('exp_cat_line_oa', 'ค่าตั้งชื่อ LINE OA', 5, NOW()),
    ('exp_cat_shipping', 'ค่าขนส่ง', 6, NOW()),
    ('exp_cat_packaging', 'ค่าบรรจุภัณฑ์', 7, NOW()),
    ('exp_cat_other', 'อื่นๆ', 99, NOW());
