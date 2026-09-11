-- CreateTable
CREATE TABLE "print_order_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "address" TEXT,
    "phone" TEXT,
    "line_oa" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "tiktok" TEXT,
    "logo_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_order_settings_pkey" PRIMARY KEY ("id")
);
