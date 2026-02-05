-- Delete remaining test categories ("Tiles Collection" and "Test") and their products
-- Previous migration (20260205100000) was applied but categories still exist

-- Delete any products still linked to these categories
DELETE FROM "products"
WHERE "category_id" IN (
  SELECT "id" FROM "product_categories" WHERE "name" IN ('Tiles Collection', 'Test')
);

-- Delete the categories themselves
DELETE FROM "product_categories" WHERE "name" IN ('Tiles Collection', 'Test');
