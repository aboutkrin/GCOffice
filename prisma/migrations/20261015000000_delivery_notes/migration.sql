-- ใบส่งสินค้า: delivery details on stock issues against a quotation
ALTER TABLE "stock_documents"
  ADD COLUMN "delivery_number" TEXT,
  ADD COLUMN "delivery_address" TEXT,
  ADD COLUMN "delivery_contact_name" TEXT,
  ADD COLUMN "delivery_contact_phone" TEXT,
  ADD COLUMN "customer_po_number" TEXT,
  ADD COLUMN "vehicle_plate" TEXT,
  ADD COLUMN "driver_name" TEXT,
  ADD COLUMN "carrier_name" TEXT,
  ADD COLUMN "delivery_remark" TEXT;

CREATE UNIQUE INDEX "stock_documents_delivery_number_key" ON "stock_documents"("delivery_number");

CREATE TABLE "delivery_note_counters" (
    "id" TEXT NOT NULL,
    "year_month" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_note_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_note_counters_year_month_key" ON "delivery_note_counters"("year_month");
