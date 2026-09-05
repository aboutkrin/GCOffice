# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GCOffice is a Thai-language business document management app (quotations & invoices) built with Next.js 16 App Router, Prisma ORM on PostgreSQL (via Supabase), and Supabase Auth. The entire UI is in Thai.

## Commands

- `npm run dev` — Start dev server at localhost:3000
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run start` — Start production server
- `npx prisma generate` — Regenerate Prisma client (runs automatically on `npm install` via postinstall)
- `npx prisma migrate dev` — Apply pending migrations in development
- `npx prisma migrate deploy` — Apply migrations in production

## Architecture

### Routing (Next.js App Router)

- `src/app/(auth)/` — Login page (unauthenticated layout group)
- `src/app/(app)/` — All protected pages (authenticated layout group): dashboard, companies, customers, products, quotations, invoices
- `src/app/api/` — API routes for file uploads, document status updates, the website catalog webhook (`api/webhooks/catalog`) and the nightly sync cron (`api/cron/catalog-sync`)
- `middleware.ts` — Supabase auth middleware; redirects unauthenticated users to `/login`. The matcher **excludes `api/webhooks` and `api/cron`**: those routes authenticate themselves (HMAC signature / `CRON_SECRET`) and would otherwise be redirected to the login page.

### Data Flow

1. **Server Actions** (`src/actions/`) — Handle all mutations (create/update/delete) for auth, companies, customers, products, documents
2. **Data Layer** (`src/data/`) — Server-side query functions for fetching lists, stats, and detail views
3. **Validation** (`src/lib/validators.ts`) — Zod schemas with Thai error messages, shared between client forms and server actions
4. **Components** — Server Components by default; `"use client"` only for interactive forms

### Database (Prisma + PostgreSQL)

Schema at `prisma/schema.prisma`. Prisma client is generated to `src/generated/prisma/` and uses `@prisma/adapter-pg` for connection pooling. The client singleton lives in `src/lib/prisma.ts`.

Key models:
- **Profile** — Synced from Supabase auth.users via DB trigger
- **Company** — Business entities with logo, bank details, VAT config
- **Customer** — COMPANY or INDIVIDUAL type, with lead source tracking
- **Product** — SKU-based catalog with categories, images, dimensions, pricing, cost fields and stock. `source` is `MANUAL` (created in GCOffice), `WEBSITE` (mirrored from goodchoiceth.com) or `WOOCOMMERCE` (legacy rows from the retired WooCommerce sync; `woocommerceId` is kept only to match website products by `wpPostId`)
- **ProductColorVariant** — Colour variants per product (name unique per product, colourHex, imageUrl, price, stock). Rows with `websiteVariantId` are website-owned; `websiteActive === false` renders the badge "ไม่แสดงบนเว็บ" but the colour stays selectable in documents
- **StockMovement** — IN/OUT/ADJUSTMENT/INITIAL movements per product or colour variant. `Product.stockQuantity` is the sum of its variants' stock once variants exist. `src/data/stock.ts` aggregates by `productSku`, so **existing SKUs must never be rewritten**
- **CatalogSyncLog** — One row per website sync run (trigger, scope, counters, dry-run `details`)
- **Document** — Quotations and invoices with status workflow (DRAFT → SENT → CONFIRMED → CANCELLED)
- **DocumentLineItem** / **DocumentPaymentTerm** — Cascade-deleted children of Document
- **DocumentCounter** — Per-type, per-month auto-incrementing document numbers

Documents store JSON snapshots of company/customer data at creation time for historical accuracy.

Financial fields use Prisma `Decimal` type (12,2 precision).

### Authentication

Supabase Auth with email/password. Four client configurations in `src/lib/supabase/`:
- `server.ts` — Server Components/Actions (cookie-based)
- `client.ts` — Browser client (`"use client"`)
- `admin.ts` — Service role client for privileged ops (file uploads bypassing RLS)
- `middleware.ts` — Session refresh on every request

### UI Stack

- **shadcn/ui** (new-york style) with Radix primitives — components in `src/components/ui/`
- **Tailwind CSS v4** — no `tailwind.config` file; all theme config is in `src/app/globals.css` via `@theme inline`
- **react-hook-form** + **@hookform/resolvers** — form state with Zod validation
- **@tanstack/react-table** — data tables
- **Sarabun** Google Font for Thai text

### Thai Localization Utilities

- `src/lib/thai-date.ts` — Buddhist Era date formatting
- `src/lib/thai-currency.ts` — Thai Baht formatting (฿)
- `src/lib/thai-number.ts` — Number-to-Thai-text conversion
- `src/lib/constants.ts` — All Thai UI labels for enums (statuses, types, lead sources)

### Document Export

- `src/lib/export-pdf.ts` — HTML-to-PDF via html2canvas-pro + jspdf (multi-page)
- `src/lib/export-jpg.ts` — HTML-to-JPG via html2canvas-pro
- Preview components in `src/components/preview/`

### Website Catalog Sync (goodchoiceth.com → GCOffice)

Products and colour variants are created on goodchoiceth.com; GCOffice pulls them. One-way, idempotent upserts, nothing is ever deleted (missing products become `INACTIVE`).

Modules in `src/lib/catalog/`:
- `types.ts` — the feed/webhook JSON contract, copied verbatim from the website (`lib/catalog/types.ts`). Only add fields, never rename or remove.
- `signature.ts` — `X-GC-Signature: t=<unix>,v1=<hmac-sha256>` sign/verify (5-minute tolerance), copied from the website.
- `client.ts` — `getCatalogConfig()`, `cleanEnv()` (scrubs a leading BOM), `fetchAllCatalogProducts()` (cursor pagination), `fetchCatalogProduct(id)` (null on 404), `fetchCatalogCategories()`, `checkCatalogHealth()`.
- `mapper.ts` — pure `mapCatalogProduct` / `mapCatalogVariant` / `stripHtml`.
- `sync.ts` — `syncAll(trigger, { dryRun })` (full reconcile, running-guard, deactivates unseen WEBSITE/WOOCOMMERCE products), `syncProductIds(ids)` (webhook path), `markWebsiteProductsDeleted(ids)`. Match order: `websiteProductId` → `woocommerceId === wpPostId` → `sku` → create. New SKUs: website sku → `WEB-<sku>` → category prefix counter → `WEB-<websiteProductId>`. Categories: `websiteCategoryId` → case-insensitive name match (then pinned) → created with the next free `WEBnn` prefix.

Routes / triggers:
- `POST /api/webhooks/catalog` — called by the website on every product save/delete; verifies the raw body signature, zod-parses `{id, event, productIds, occurredAt}`, runs the sync in `after()` and returns `202 {ok, received}`.
- `GET /api/cron/catalog-sync` — nightly full reconcile (`vercel.json`), `Authorization: Bearer ${CRON_SECRET}`.
- `/website-sync` page — connection status, "ตรวจสอบก่อนซิงค์" (dry run with `details`) and "ซิงค์ตอนนี้" (`src/actions/catalog-actions.ts`).

Field ownership (enforced in `sync.ts`, `src/actions/product-actions.ts` and the product form):

| Website-owned (overwritten on every sync) | GCOffice-owned (never touched by sync) |
|---|---|
| Product: name, description, imageUrl (first image), basePrice (`effectivePrice`), status (published → ACTIVE), categoryId, websiteSlug, websiteSpecs (tile facts JSON), websiteUpdatedAt, source = WEBSITE | Product: costPrice, exchangeRate, weightPerBox, shippingCostPerBox, width/height, stockQuantity, lowStockThreshold, **existing sku** |
| Variant (rows with `websiteVariantId`): name, colorHex, imageUrl, sortOrder, sku, websiteActive, websiteStockStatus | Variant: price, stockQuantity, lowStockThreshold, stock movements; variants without `websiteVariantId`; MANUAL products |

WEBSITE products cannot be deleted in GCOffice (delete on the website instead); their product fields are read-only in the form with a link to `${CATALOG_API_URL}/admin/products/<websiteProductId>`. `saveColorVariantsInTransaction` never deletes website-owned variants and updates only their `price`.

### Custom Hooks

- `use-line-items.ts` — Manage document line item state
- `use-payment-terms.ts` — Manage payment term state
- `use-pricing.ts` — Calculate discount, VAT, and totals

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin key (server-only)
- `CRON_SECRET` — Bearer token Vercel sends to `/api/cron/*`
- `CATALOG_API_URL` — goodchoiceth.com origin (e.g. `https://goodchoiceth.com`); also used for the admin edit links
- `CATALOG_API_KEY` — shared key: Bearer for `/api/catalog/*` on the website and HMAC secret for the webhook. Must equal the website's `CATALOG_API_KEY`; a pasted BOM is scrubbed by `cleanEnv()`

## Key Conventions

- Path alias: `@/*` maps to `src/*`
- `src/lib/utils.ts` exports `cn()` (clsx + tailwind-merge) and `serialize()` for Prisma Decimal-to-plain conversion
- Call `serialize()` on Prisma query results before passing to Client Components (Decimal/Date objects are not serializable)
- Server actions call `revalidatePath()` after mutations for cache invalidation
- All user-facing text is in Thai; HTML lang is set to `"th"`
- Zod validation error messages are in Thai
- Icons from `lucide-react`
- Remote images from Supabase storage are allowed in `next.config.ts` (`*.supabase.co`)
- No test framework is configured; there are no tests in this project
