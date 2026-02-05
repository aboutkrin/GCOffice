-- Remove test/trial categories and their products from the system

-- First, delete products belonging to the "Tiles Collection" test category
DELETE FROM "products"
WHERE "category_id" IN (
  SELECT "id" FROM "product_categories" WHERE "name" = 'Tiles Collection'
);

-- Delete the test categories
DELETE FROM "product_categories" WHERE "name" = 'Tiles Collection';
DELETE FROM "product_categories" WHERE "name" = 'Test';
