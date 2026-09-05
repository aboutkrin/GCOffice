# Website catalog sync: goodchoiceth.com → GCOffice

Reference for the migration off WooCommerce. Implementation is complete on branch
`claude/gcoffice-wordpress-migration-vl3nv9` in both repos (`aboutkrin/goodchoiceth.com`
commit `58240bf`, `aboutkrin/GCOffice` commit `7533e8b`). This file records what was built,
how to rehearse it on staging, how to back up, how to cut over, and how to roll back.

## 1. Why

goodchoiceth.com was rebuilt from WordPress/WooCommerce into a custom Next.js storefront.
GCOffice still pulled products from the WooCommerce REST API on a daily cron. Once WordPress is
switched off that sync breaks. The business strategy is unchanged: **products and colour variants
are created on goodchoiceth.com; GCOffice picks them up** for quotations, stock and costing.
The website now exposes its catalog itself and pushes changes to GCOffice.

Decisions made with the owner:

1. Trigger: webhook from the website on every product save/delete, plus a nightly full reconcile,
   plus the manual "ซิงค์ตอนนี้" button.
2. Credentials live in environment variables only (one shared key). The WooCommerce settings form
   and tables are gone.
3. Colours switched off on the website (`is_active = false`) stay selectable in GCOffice
   quotations, shown with the badge "ไม่แสดงบนเว็บ". Never hidden, never deleted.
4. One-way website → GCOffice for now. Stock management will move to GCOffice later; the website
   stock status is mirrored into a separate column so a future reverse push is straightforward.

## 2. What was built

### goodchoiceth.com
| Piece | Where |
|---|---|
| Catalog feed (bearer key, reads the DB directly, includes drafts and inactive colours) | `app/api/catalog/{health,categories,products,products/[id]}/route.ts`, `lib/catalog/feed.ts`, `lib/catalog/auth.ts` |
| JSON contract + HMAC signature helper (copied verbatim into GCOffice) | `lib/catalog/types.ts`, `lib/catalog/signature.ts` |
| Pure shaping helpers (primary category, hex from colour family, absolute media URLs) | `lib/catalog/shape.ts`, tested in `tests/catalog.test.ts` |
| Webhook dispatcher, scheduled with `after()` from every admin product save/status/delete | `lib/gcoffice-webhook.ts`, hooked in `app/admin/(dashboard)/products/actions.ts` |
| Legacy media redirect `/wp-content/uploads/YYYY/MM/file` → same key on the media host | `middleware.ts` |
| Env vars | `CATALOG_API_KEY`, `GCOFFICE_WEBHOOK_URL` (see `.env.example`, README "Catalog API for GCOffice") |

### GCOffice
| Piece | Where |
|---|---|
| Client, pure mapper, sync engine (full reconcile, per-id webhook path, dry run) | `src/lib/catalog/{client,mapper,sync}.ts` |
| Webhook receiver (verifies the raw body signature, runs in `after()`, returns 202) | `src/app/api/webhooks/catalog/route.ts` |
| Nightly cron (Bearer `CRON_SECRET`) | `src/app/api/cron/catalog-sync/route.ts`, `vercel.json` |
| Middleware matcher excludes `api/webhooks` and `api/cron` (they were being redirected to `/login`) | `middleware.ts` |
| Page: connection status, "ตรวจสอบก่อนซิงค์" (dry run), "ซิงค์ตอนนี้", history | `src/app/(app)/website-sync/`, `src/components/website-sync/`, `src/actions/catalog-actions.ts`, `src/data/catalog.ts` |
| Schema: `websiteProductId/Slug/Specs/UpdatedAt`, `lastSyncedAt` on Product; `websiteCategoryId` on ProductCategory; `sku`, `websiteVariantId`, `websiteActive`, `websiteStockStatus` on ProductColorVariant; `CatalogSyncLog`; enum values `WEBSITE`, `WEBHOOK`; WooCommerce tables dropped | `prisma/schema.prisma`, `prisma/migrations/20260905000000_website_catalog_sync/` |
| Guards: WEBSITE products cannot be deleted or edited here (form is read-only with a link to the website admin); website-owned colours are never deleted and only their price is editable | `src/actions/product-actions.ts`, `src/components/products/product-form.tsx`, `color-variants-section.tsx`, `product-table.tsx`, `src/components/documents/product-picker.tsx` |
| Env vars | `CATALOG_API_URL`, `CATALOG_API_KEY`, `CRON_SECRET` |

### Matching rules (first sync = cutover)
- Product: `websiteProductId` → `woocommerceId === wpPostId` (the website kept the old WooCommerce ids) → same `sku` → create.
  A MANUAL product with the same SKU as a website product is treated as the same product and linked.
- Existing SKUs are never rewritten (stock history is aggregated by SKU). New SKUs: website sku → `WEB-<sku>` → category prefix counter → `WEB-<websiteProductId>`.
- Category: `websiteCategoryId` → case-insensitive Thai name match (then pinned) → created with the next free `WEBnn` prefix.
- Colour: `websiteVariantId` → exact name → case-insensitive trimmed name → create. Never deleted.
- Products missing from the feed become INACTIVE (never deleted). MANUAL products are never touched.

### Field ownership
| Website-owned (overwritten every sync) | GCOffice-owned (never touched) |
|---|---|
| Product: name, description, first image URL, basePrice (`salePrice ?? price`), status, category, websiteSlug, websiteSpecs (tile facts), source = WEBSITE | Product: costPrice, exchangeRate, weightPerBox, shippingCostPerBox, width/height, stockQuantity, lowStockThreshold, existing sku |
| Colour (rows with websiteVariantId): name, colorHex, imageUrl, sortOrder, sku, websiteActive, websiteStockStatus | Colour: price, stockQuantity, lowStockThreshold, stock movements; colours without websiteVariantId; MANUAL products; all documents (snapshots, no FK) |

### Images
Only URLs are stored, as before. They point at the website's media host (Cloudflare R2), which is
independent of WordPress. Old document snapshots still reference
`goodchoiceth.com/wp-content/uploads/...`; the website now 301-redirects those to the same file on
the media host, so they heal the moment the website change is in production.

## 3. What was verified locally (2026-09-05)
- Website: lint unchanged from baseline, `npm run build` passes, `npm test` passes; every feed route exercised with curl (401 without/with wrong key, pagination cursors to `null`, 404 for unknown id, 400 for bad query, 301 legacy redirect with `-scaled`/`-WxH` stripped).
- GCOffice: the new migration applied cleanly to a database built from the pre-change schema; `prisma migrate diff` afterwards was empty; `npm run build` passes.
- End-to-end against the local website with seeded pre-cutover data: a WooCommerce-era product matched by SKU kept cost, stock and colour price; a same-named colour was linked and kept its stock movement; a GCOffice-only colour was kept; a stale product was deactivated; a manual product was untouched. Second run: 0 created, 0 deactivated, 12 updated, no duplicate colours. Webhook: 7 rejection cases → 401/400; update and delete events produced the expected log rows; a deleted-then-restored product was re-activated by the next full run. Dry run wrote nothing and listed unmatched colours.

## 4. Before production: check this first
GCOffice's build command is `prisma migrate deploy; next build`. Vercel builds every pushed branch as
a **Preview** deployment. If the GCOffice Vercel project has its database variables enabled for the
Preview environment (the Supabase integration enables all environments by default), the preview
build of this branch has **already applied the migration to production**.

- Vercel → GCOffice → Deployments → the `claude/gcoffice-wordpress-migration-vl3nv9` deployment → Build Logs.
  Look for `The following migration(s) have been applied` vs `No pending migrations to apply`.
- If applied: data is intact (columns are additive and nullable; only `woocommerce_configs` and
  `woocommerce_sync_logs` were dropped). The old `/woocommerce` page and old cron error until the new
  code ships. Cut over sooner rather than later; still take the backups below before the first sync.
- Either way, fix the trap: make the database variables **Production-only** in Vercel and add
  Preview-scoped ones pointing at the staging database (next section). Same for `CATALOG_API_URL`,
  `CATALOG_API_KEY`, `CRON_SECRET`.

## 5. Backups (take right before the production cutover)
| What | How | Restore |
|---|---|---|
| GCOffice DB (Supabase) | `pg_dump "$POSTGRES_URL_NON_POOLING" --schema=public -Fc -f gcoffice-pre-catalog-sync.dump` (direct connection string from Supabase → Settings → Database). Confirm the dashboard's daily backup / PITR for your plan. | Full: `pg_restore --clean --if-exists -d "$POSTGRES_URL_NON_POOLING" gcoffice-pre-catalog-sync.dump`. Undo only the first sync: `pg_restore --clean --if-exists -t products -t product_color_variants -t product_categories -d ... gcoffice-pre-catalog-sync.dump`. |
| Website DB (Neon) | Neon console → Branches → create `pre-catalog-sync` from `main` (instant snapshot). Neon also offers point-in-time restore. | Restore `main` from the branch. Not expected to be needed: the website change writes nothing new to its DB. |
| Code | On each repo's default branch: `git tag prod-pre-catalog-sync && git push origin prod-pre-catalog-sync`. Vercel keeps every previous deployment. | Vercel → Deployments → previous production deployment → **Instant Rollback**. For GCOffice, pair with the three-table restore if the first sync already ran. |

R2 media and Supabase Storage are not modified. No backup needed.

## 6. Staging = Vercel Preview deployments + cloned databases

**Website staging**
1. Neon: create branch `staging` from `main` (full copy of the products). Copy its connection string.
2. Vercel → goodchoiceth.com → Environment Variables scoped **Preview → branch `claude/gcoffice-wordpress-migration-vl3nv9`**:
   `DATABASE_URL` = staging branch; `CATALOG_API_KEY` = a staging key (`openssl rand -hex 32`);
   `GCOFFICE_WEBHOOK_URL` = `https://<gcoffice-preview>/api/webhooks/catalog` (fill in after GCOffice staging step 4);
   `SITE_URL` = the preview URL.
3. Redeploy the preview. If Vercel **Deployment Protection** is on for previews, GCOffice cannot reach
   the feed and the webhook cannot be received: disable protection for previews during the rehearsal,
   or assign a custom domain such as `staging.goodchoiceth.com` to the branch (cleanest long-term staging).
4. `curl -H "Authorization: Bearer $STAGING_KEY" https://<website-preview>/api/catalog/health` → `productCount` ≈ 263.

**GCOffice staging**
1. Create a second Supabase project (free tier) e.g. `gcoffice-staging`. Restore the production dump:
   `pg_restore --no-owner --no-privileges -d "<staging direct url>" gcoffice-pre-catalog-sync.dump`.
2. Auth: add your email/password user in the staging project's Authentication, then insert the matching
   `profiles` row (or re-create the production `handle_new_user` trigger) so login works.
3. Vercel → GCOffice → Environment Variables scoped **Preview → this branch**: `POSTGRES_URL`,
   `POSTGRES_URL_NON_POOLING`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` = staging project; `CATALOG_API_URL` = website preview URL;
   `CATALOG_API_KEY` = the staging key; `CRON_SECRET` = any value.
4. Redeploy the preview. The build applies the migration to the **staging** database only.

**Rehearsal checklist (all on previews)**
1. GCOffice `/website-sync`: status card green, website product count shown.
2. "ตรวจสอบก่อนซิงค์": read `toCreate`, `toDeactivate` (only products deleted on the website),
   `categoriesToCreate` (expect none or few), `unmatchedColours` (rename staging GCOffice colours to
   the website names and re-run until acceptable).
3. "ซิงค์ตอนนี้". Compare 3 products with production: cost, stock, colour prices unchanged;
   name/price/image now from the website.
4. New quotation: pick a product with colours, confirm the "ไม่แสดงบนเว็บ" badge on an inactive one,
   export the PDF, image renders.
5. Legacy redirect: `curl -sI https://<website-preview>/wp-content/uploads/2024/05/<real file>.jpg` → 301.
   Old documents heal only after the production website deploy (snapshots reference the production domain).
6. Webhook: edit a product in the website preview admin → a `WEBHOOK` row appears in GCOffice history within seconds.
7. Cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://<gcoffice-preview>/api/cron/catalog-sync` → JSON, not a login redirect.
8. Dry run again → `toCreate` and `toDeactivate` empty, `updated` = product count.

## 7. Production cutover (in this order)
1. **Website first** (additive, safe): merge the branch, deploy. Production env: `CATALOG_API_KEY=$(openssl rand -hex 32)`;
   leave `GCOFFICE_WEBHOOK_URL` unset. Verify `curl -H "Authorization: Bearer $KEY" https://goodchoiceth.com/api/catalog/health`
   → 200 with `productCount`; without the header → 401.
2. **Back up GCOffice** (section 5).
3. **GCOffice**: production env `CATALOG_API_URL=https://goodchoiceth.com`, `CATALOG_API_KEY=<same key>`;
   merge and deploy (build runs the migration). Vercel Crons should list `/api/cron/catalog-sync`.
4. `/website-sync` → status green → "ตรวจสอบก่อนซิงค์". Expect `totalFetched` ≈ 263, `toUpdate` ≈ former
   WooCommerce products still on the site, `toCreate` = products added since, `toDeactivate` = products
   deleted on the website, `categoriesToCreate` few or none, `unmatchedColours` reviewed.
5. "ซิงค์ตอนนี้". Verify: count of `source='WEBSITE'` = website count; a product with colours has
   `websiteVariantId` set; cost, stock and colour prices unchanged vs the backup; picker shows the badge.
6. **Enable webhooks**: website env `GCOFFICE_WEBHOOK_URL=https://<gcoffice-domain>/api/webhooks/catalog`,
   redeploy the website. Edit a product → `WEBHOOK` row in GCOffice within seconds.
7. Trigger the cron once by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<gcoffice>/api/cron/catalog-sync`.
8. Re-export one old quotation PDF: its WordPress image URL now resolves through the redirect.
9. Revoke the old WooCommerce consumer keys if the WordPress host still exists.

**Rollback**: website → unset `GCOFFICE_WEBHOOK_URL` (stops pushes); the API is harmless to leave, or
Instant Rollback. GCOffice → Instant Rollback to the previous deployment, plus the three-table restore
from section 5 if the first sync already ran.

**Env checklist**: website `CATALOG_API_KEY`, `GCOFFICE_WEBHOOK_URL`; GCOffice `CATALOG_API_URL`,
`CATALOG_API_KEY`, `CRON_SECRET` (existing).

## 8. Known behaviour and future work
- Vercel `maxDuration` is 300s on the cron route; on a Hobby plan without Fluid compute lower it to 60. A full run of ~263 products took under a second locally against 12 products; measure the first production run.
- Two website colours whose names differ only by case would collide on GCOffice's unique index; the second is counted as `failed` in the log and the run continues.
- Out of scope for now: reverse stock push, image gallery, using `updatedSince`, tombstones, encrypting the key.
- Future stock phase (hook only): GCOffice stock movements → `PATCH /api/catalog/variants/[id]/stock` on the website (same bearer) setting `product_variants.stock_status` and recomputing the product roll-up; at that point `websiteStockStatus` stops being overwritten by the pull.
