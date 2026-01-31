-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN "prefix" TEXT,
ADD COLUMN "last_number" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_prefix_key" ON "product_categories"("prefix");
