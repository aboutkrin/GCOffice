-- The shipment form now uses `title` for "เลข Tracking / รายการสินค้า" (shown on
-- the calendar) and `container_no` for "เลขล็อต". Swap existing rows that were
-- entered with the old labels (title = lot, container_no = tracking).
UPDATE "china_shipments"
SET "title" = "container_no", "container_no" = "title"
WHERE "container_no" IS NOT NULL AND btrim("container_no") <> '';
