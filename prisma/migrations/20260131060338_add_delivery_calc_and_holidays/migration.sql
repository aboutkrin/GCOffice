-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "production_days_max" INTEGER,
ADD COLUMN     "production_days_min" INTEGER,
ADD COLUMN     "skip_holidays" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skip_weekends" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "holidays"("date");
