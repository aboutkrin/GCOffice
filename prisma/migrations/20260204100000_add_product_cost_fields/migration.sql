-- AlterTable
ALTER TABLE "products" ADD COLUMN "cost_price" DECIMAL(12,2);
ALTER TABLE "products" ADD COLUMN "exchange_rate" DECIMAL(10,4);
ALTER TABLE "products" ADD COLUMN "weight_per_box" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN "shipping_cost_per_box" DECIMAL(12,2);
