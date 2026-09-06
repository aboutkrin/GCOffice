-- Snapshot of the website colour code (ProductColorVariant.sku) on document lines.
-- color_variant_name stays the bare colour name: stock deduction matches on it.

-- AlterTable
ALTER TABLE "document_line_items" ADD COLUMN "color_variant_sku" TEXT;
