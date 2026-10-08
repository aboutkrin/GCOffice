-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('TRUCK', 'SEA');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "actual_delivery_cost" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "document_line_items" ADD COLUMN     "unit_cost" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "import_lots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_date" DATE NOT NULL,
    "china_shipment_id" TEXT,
    "transport_mode" "TransportMode" NOT NULL DEFAULT 'SEA',
    "rate_per_kg" DECIMAL(10,2) NOT NULL,
    "freight_override" DECIMAL(12,2),
    "other_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exchange_rate" DECIMAL(10,4) NOT NULL,
    "total_weight_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_landed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "pi_number" TEXT,
    "pi_date" DATE,
    "image_url" TEXT,
    "fees" JSONB NOT NULL DEFAULT '[]',
    "stated_total_cny" DECIMAL(14,2),

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "description" TEXT,
    "boxes" INTEGER NOT NULL,
    "sqm" DECIMAL(10,2),
    "amount_cny" DECIMAL(14,2) NOT NULL,
    "weight_kg" DECIMAL(10,2),
    "product_id" TEXT,
    "color_variant_id" TEXT,
    "landed_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "landed_per_box" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "supplier_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_code_aliases" (
    "id" TEXT NOT NULL,
    "supplier_key" TEXT NOT NULL,
    "code_key" TEXT NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "color_variant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_code_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_lots_order_date_idx" ON "import_lots"("order_date");

-- CreateIndex
CREATE INDEX "supplier_invoices_lot_id_idx" ON "supplier_invoices"("lot_id");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_invoice_id_idx" ON "supplier_invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_product_id_idx" ON "supplier_invoice_items"("product_id");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_color_variant_id_idx" ON "supplier_invoice_items"("color_variant_id");

-- CreateIndex
CREATE INDEX "supplier_code_aliases_code_key_idx" ON "supplier_code_aliases"("code_key");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_code_aliases_supplier_key_code_key_key" ON "supplier_code_aliases"("supplier_key", "code_key");

-- AddForeignKey
ALTER TABLE "import_lots" ADD CONSTRAINT "import_lots_china_shipment_id_fkey" FOREIGN KEY ("china_shipment_id") REFERENCES "china_shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_lots" ADD CONSTRAINT "import_lots_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "import_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_color_variant_id_fkey" FOREIGN KEY ("color_variant_id") REFERENCES "product_color_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_code_aliases" ADD CONSTRAINT "supplier_code_aliases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_code_aliases" ADD CONSTRAINT "supplier_code_aliases_color_variant_id_fkey" FOREIGN KEY ("color_variant_id") REFERENCES "product_color_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

