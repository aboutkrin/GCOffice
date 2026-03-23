-- CreateTable
CREATE TABLE "product_color_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color_hex" TEXT,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_color_variants_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "document_line_items" ADD COLUMN "color_variant_name" TEXT;

-- AddColumn
ALTER TABLE "stock_movements" ADD COLUMN "color_variant_id" TEXT;

-- CreateIndex
CREATE INDEX "product_color_variants_product_id_idx" ON "product_color_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_variants_product_id_name_key" ON "product_color_variants"("product_id", "name");

-- CreateIndex
CREATE INDEX "stock_movements_color_variant_id_idx" ON "stock_movements"("color_variant_id");

-- AddForeignKey
ALTER TABLE "product_color_variants" ADD CONSTRAINT "product_color_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_color_variant_id_fkey" FOREIGN KEY ("color_variant_id") REFERENCES "product_color_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
