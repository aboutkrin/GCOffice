-- Editing a quotation used to delete and recreate its line items, and the
-- FK nulled source_line_item_id on delivery rounds already issued against
-- it, so those rounds stopped counting as shipped. Re-link each orphaned
-- line of a delivery round to the quotation's current line item with the
-- same product / colour, when exactly one such item exists.
UPDATE "stock_document_lines" AS sl
SET "source_line_item_id" = (
  SELECT li."id"
  FROM "document_line_items" li
  WHERE li."document_id" = sd."source_document_id"
    AND li."product_id" = sl."product_id"
    AND li."color_variant_id" IS NOT DISTINCT FROM sl."color_variant_id"
)
FROM "stock_documents" sd
WHERE sl."stock_document_id" = sd."id"
  AND sd."type" = 'ISSUE'
  AND sd."source_document_id" IS NOT NULL
  AND sl."source_line_item_id" IS NULL
  AND (
    SELECT COUNT(*)
    FROM "document_line_items" li
    WHERE li."document_id" = sd."source_document_id"
      AND li."product_id" = sl."product_id"
      AND li."color_variant_id" IS NOT DISTINCT FROM sl."color_variant_id"
  ) = 1
  -- the unique (document, product, colour, source line) index
  AND NOT EXISTS (
    SELECT 1
    FROM "stock_document_lines" other
    JOIN "document_line_items" li ON li."id" = other."source_line_item_id"
    WHERE other."stock_document_id" = sl."stock_document_id"
      AND li."document_id" = sd."source_document_id"
      AND li."product_id" = sl."product_id"
      AND li."color_variant_id" IS NOT DISTINCT FROM sl."color_variant_id"
  );
