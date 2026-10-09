-- Which import lots a line's manual cost was blended from (profit per bill)
ALTER TABLE "document_line_items" ADD COLUMN "cost_breakdown" JSONB;
