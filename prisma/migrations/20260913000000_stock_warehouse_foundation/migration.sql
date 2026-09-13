-- ============================================================
-- Stock warehouse foundation: stable scan codes, line-item variant
-- identity, reservation opt-in flag, and the stock document model
-- (goods receive / goods issue / stock count).
--
-- No existing stock_quantity or stock_movements rows are touched.
-- documents.reserves_stock defaults to false for every existing row,
-- which is the entire cutover: pre-existing CONFIRMED/SHIPPED
-- documents keep reserving nothing (they already deducted stock the
-- old way and are treated as already issued). See CLAUDE.md / the
-- stock plan for the full rationale.
-- ============================================================

-- CreateEnum
CREATE TYPE "StockDocumentType" AS ENUM ('RECEIVE', 'ISSUE', 'COUNT');

-- CreateEnum
CREATE TYPE "StockDocumentStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- ============================================================
-- 1. Product.stockCode — backfilled from sku, then immutable
-- ============================================================

ALTER TABLE "products" ADD COLUMN "stock_code" TEXT;

UPDATE "products" SET "stock_code" = "sku" WHERE "stock_code" IS NULL;

-- Pre-flight check (informational): this must return zero rows before the
-- NOT NULL + unique index below can succeed. Two products sharing a sku
-- would already have violated the products_sku_key unique constraint, so
-- this should never fire, but a duplicate here fails the migration loudly
-- rather than silently mis-labelling products.
-- SELECT stock_code, count(*) FROM products GROUP BY stock_code HAVING count(*) > 1;

ALTER TABLE "products" ALTER COLUMN "stock_code" SET NOT NULL;

CREATE UNIQUE INDEX "products_stock_code_key" ON "products"("stock_code");

-- ============================================================
-- 2. ProductColorVariant.stockCode — "<productStockCode>#<nn>",
--    nn assigned once per product in stable (sortOrder, name, id) order
-- ============================================================

ALTER TABLE "product_color_variants" ADD COLUMN "stock_code" TEXT;

WITH ordered AS (
  SELECT
    v."id",
    p."stock_code" AS pcode,
    row_number() OVER (
      PARTITION BY v."product_id"
      ORDER BY v."sort_order", v."name", v."id"
    ) AS rn
  FROM "product_color_variants" v
  JOIN "products" p ON p."id" = v."product_id"
)
UPDATE "product_color_variants" v
SET "stock_code" = o.pcode || '#' || lpad(o.rn::text, 2, '0')
FROM ordered o
WHERE o."id" = v."id";

ALTER TABLE "product_color_variants" ALTER COLUMN "stock_code" SET NOT NULL;

CREATE UNIQUE INDEX "product_color_variants_stock_code_key" ON "product_color_variants"("stock_code");

-- ============================================================
-- 3. DocumentLineItem gains stable product/variant identity,
--    backfilled by sku then by (productId, name). Left NULL when
--    unmatched (deleted product, colour renamed before this backfill).
-- ============================================================

ALTER TABLE "document_line_items" ADD COLUMN "product_id" TEXT;
ALTER TABLE "document_line_items" ADD COLUMN "color_variant_id" TEXT;

UPDATE "document_line_items" li
SET "product_id" = p."id"
FROM "products" p
WHERE p."sku" = li."product_sku" AND li."product_sku" IS NOT NULL;

UPDATE "document_line_items" li
SET "color_variant_id" = v."id"
FROM "product_color_variants" v
WHERE v."product_id" = li."product_id"
  AND v."name" = li."color_variant_name"
  AND li."color_variant_name" IS NOT NULL;

CREATE INDEX "document_line_items_product_id_idx" ON "document_line_items"("product_id");
CREATE INDEX "document_line_items_color_variant_id_idx" ON "document_line_items"("color_variant_id");

ALTER TABLE "document_line_items" ADD CONSTRAINT "document_line_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_line_items" ADD CONSTRAINT "document_line_items_color_variant_id_fkey"
  FOREIGN KEY ("color_variant_id") REFERENCES "product_color_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 4. Document.reservesStock — the cutover flag (defaults false)
-- ============================================================

ALTER TABLE "documents" ADD COLUMN "reserves_stock" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 5. Stock document counters
-- ============================================================

CREATE TABLE "stock_document_counters" (
    "id" TEXT NOT NULL,
    "type" "StockDocumentType" NOT NULL,
    "year_month" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_document_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_document_counters_type_year_month_key" ON "stock_document_counters"("type", "year_month");

-- ============================================================
-- 6. Stock documents (header)
-- ============================================================

CREATE TABLE "stock_documents" (
    "id" TEXT NOT NULL,
    "type" "StockDocumentType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "status" "StockDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "document_date" DATE NOT NULL,
    "source_document_id" TEXT,
    "note" TEXT,
    "reference" TEXT,
    "lot_number" TEXT,
    "created_by_id" UUID NOT NULL,
    "posted_at" TIMESTAMP(3),
    "posted_by_id" UUID,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_id" UUID,
    "reversal_of_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_documents_document_number_key" ON "stock_documents"("document_number");
CREATE UNIQUE INDEX "stock_documents_reversal_of_id_key" ON "stock_documents"("reversal_of_id");
CREATE INDEX "stock_documents_type_status_idx" ON "stock_documents"("type", "status");
CREATE INDEX "stock_documents_document_date_idx" ON "stock_documents"("document_date");
CREATE INDEX "stock_documents_source_document_id_idx" ON "stock_documents"("source_document_id");

ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_source_document_id_fkey"
  FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_posted_by_id_fkey"
  FOREIGN KEY ("posted_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_reversal_of_id_fkey"
  FOREIGN KEY ("reversal_of_id") REFERENCES "stock_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 7. Stock document lines
-- ============================================================

CREATE TABLE "stock_document_lines" (
    "id" TEXT NOT NULL,
    "stock_document_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "product_id" TEXT NOT NULL,
    "color_variant_id" TEXT,
    "product_sku" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "color_variant_name" TEXT,
    "stock_code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "system_quantity" INTEGER,
    "source_line_item_id" TEXT,
    "ordered_quantity" INTEGER,
    "lot_number" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_document_lines_pkey" PRIMARY KEY ("id")
);

-- Makes scanning the same item twice on one document an increment
-- rather than a duplicate row (Postgres treats NULLs as distinct, so
-- free-form lines with no colour/source still rely on find-then-update
-- in the action; this stays as a safety net for the non-null case).
CREATE UNIQUE INDEX "stock_document_lines_unique_line_key"
  ON "stock_document_lines"("stock_document_id", "product_id", "color_variant_id", "source_line_item_id");

CREATE INDEX "stock_document_lines_stock_document_id_idx" ON "stock_document_lines"("stock_document_id");
CREATE INDEX "stock_document_lines_product_id_color_variant_id_idx" ON "stock_document_lines"("product_id", "color_variant_id");
CREATE INDEX "stock_document_lines_source_line_item_id_idx" ON "stock_document_lines"("source_line_item_id");

ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_stock_document_id_fkey"
  FOREIGN KEY ("stock_document_id") REFERENCES "stock_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_color_variant_id_fkey"
  FOREIGN KEY ("color_variant_id") REFERENCES "product_color_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_source_line_item_id_fkey"
  FOREIGN KEY ("source_line_item_id") REFERENCES "document_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 8. StockMovement gains provenance + idempotent-reversal columns
-- ============================================================

ALTER TABLE "stock_movements" ADD COLUMN "stock_document_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "stock_document_line_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "reverses_movement_id" TEXT;

-- The uniqueness here is what makes a cancel/reversal idempotent at the
-- database level: a second attempt to reverse the same movement fails
-- the insert instead of silently double-reversing (see
-- restoreStockForDocument in the pre-existing code for what this fixes).
CREATE UNIQUE INDEX "stock_movements_reverses_movement_id_key" ON "stock_movements"("reverses_movement_id");
CREATE INDEX "stock_movements_stock_document_id_idx" ON "stock_movements"("stock_document_id");

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stock_document_id_fkey"
  FOREIGN KEY ("stock_document_id") REFERENCES "stock_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stock_document_line_id_fkey"
  FOREIGN KEY ("stock_document_line_id") REFERENCES "stock_document_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reverses_movement_id_fkey"
  FOREIGN KEY ("reverses_movement_id") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
