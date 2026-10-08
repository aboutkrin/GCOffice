-- Photos of the goods in a China shipment, so the team can see which tiles are coming
ALTER TABLE "china_shipments" ADD COLUMN "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
