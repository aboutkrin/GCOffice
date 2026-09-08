ALTER TABLE "profiles" ADD COLUMN "username" TEXT;

-- Derive from the email local part: lowercase, strip anything outside [a-z0-9._-],
-- fall back to 'user' when the result is empty or shorter than the 3-char minimum,
-- then suffix duplicates with a row number.
WITH base AS (
  SELECT
    id,
    CASE
      WHEN length(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g')) >= 3
        THEN regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g')
      ELSE 'user'
    END AS candidate
  FROM "profiles"
),
numbered AS (
  SELECT id, candidate,
         ROW_NUMBER() OVER (PARTITION BY candidate ORDER BY id) AS rn
  FROM base
)
UPDATE "profiles" p
SET "username" = CASE WHEN n.rn = 1 THEN n.candidate ELSE n.candidate || n.rn::text END
FROM numbered n
WHERE p.id = n.id;

CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");
