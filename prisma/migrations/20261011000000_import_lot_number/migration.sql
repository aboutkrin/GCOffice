-- ImportLot.name now holds the tracking no.; the lot no. arrives later
ALTER TABLE "import_lots" ADD COLUMN "lot_number" TEXT;
