-- Remove duplicate holidays (same day, name and type), keeping the oldest row
DELETE FROM "holidays" h
USING "holidays" d
WHERE h."date" = d."date"
  AND h."name" = d."name"
  AND h."type" = d."type"
  AND (h."created_at", h."id") > (d."created_at", d."id");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_name_type_key" ON "holidays"("date", "name", "type");
