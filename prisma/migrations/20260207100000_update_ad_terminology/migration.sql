-- Update ad category names: ค่ายิงแอด → Ads
UPDATE "expense_categories" SET "name" = 'Ads Facebook', "updated_at" = NOW() WHERE "id" = 'exp_cat_fb_ads';
UPDATE "expense_categories" SET "name" = 'Ads Instagram', "updated_at" = NOW() WHERE "id" = 'exp_cat_ig_ads';
UPDATE "expense_categories" SET "name" = 'Ads TikTok', "updated_at" = NOW() WHERE "id" = 'exp_cat_tiktok_ads';

-- Remove packaging category (set inactive so existing expenses are not orphaned)
UPDATE "expense_categories" SET "status" = 'INACTIVE', "updated_at" = NOW() WHERE "id" = 'exp_cat_packaging';
