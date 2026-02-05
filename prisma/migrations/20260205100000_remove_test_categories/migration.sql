-- Remove test/trial categories and their products from the system

-- First, delete products belonging to the test categories
DELETE FROM "products"
WHERE "category_id" IN (
  SELECT "id" FROM "product_categories" WHERE "name" IN ('Tiles Collection', 'Test')
);

-- Delete the test categories
DELETE FROM "product_categories" WHERE "name" IN ('Tiles Collection', 'Test');
