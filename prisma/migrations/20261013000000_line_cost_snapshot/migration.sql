-- Landed cost per unit locked when a quotation is confirmed (profit per bill)
ALTER TABLE "document_line_items" ADD COLUMN "cost_snapshot" DECIMAL(12,2);
