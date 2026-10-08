# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GCOffice is a Thai-language business document management app (quotations & invoices) built with Next.js 16 App Router, Prisma ORM on PostgreSQL (via Supabase), and Supabase Auth. The entire UI is in Thai.

## Commands

- `npm run dev` — Start dev server at localhost:3000
- `npm run build` — Production build; runs `prisma migrate deploy` first (a failed migration stops the build), except on Vercel Preview (`VERCEL_ENV=preview`), which skips migrations so unmerged branches never touch the database
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
- **Holiday** — Holidays (admin-managed at `/holidays`), `type` COMPANY (office closed — red on calendars), PUBLIC (general public holiday the office still works — grey, reference only) or CHINA (Chinese holiday, e.g. Golden Week — red dashed; office works but China doesn't ship). All types are skipped by delivery-date math because carriers are closed / China doesn't ship. The office works Mon–Sat: only Sunday is a weekend (red) on calendars and in `delivery-date.ts`. Drives working-day math for delivery dates (`src/lib/delivery-date.ts`), so **employee leave must never be stored here**. Stored one row per day; consecutive days with the same name/type/recurrence are shown and edited as one group (`src/lib/holiday-groups.ts`, `updateHolidayGroup` replaces the group's rows with the edited range)
- **LeaveRequest** — Employee leave (type SICK/PERSONAL/ANNUAL/MATERNITY/PATERNITY/CHILDCARE/STERILIZATION/MILITARY/OTHER (= unpaid), FULL_DAY/MORNING/AFTERNOON, status PENDING → APPROVED/REJECTED, or CANCELLED). STAFF request for themselves (PENDING); ADMIN can record leave for anyone (auto-APPROVED) and approve/reject. Actions in `src/actions/leave-actions.ts`
- **ChinaShipment** — Shipments from China: `title` = "เลข Tracking / รายการสินค้า" (shown on the calendar), `containerNo` = "เลขล็อต"; shippedDate, etaDate, arrivedDate, receivedDate with status SHIPPED → ARRIVED_TH → RECEIVED (or CANCELLED). `imageUrls` = photos of the goods in the lot (up to 12, uploaded to `product-images/china-shipments/`), shown as thumbnails with a full-size viewer on the calendar day view and the "ของจากจีนที่กำลังมา" card (`shipment-images.tsx`). Any user can add/advance; only ADMIN can delete. Actions in `src/actions/china-shipment-actions.ts`
- **ImportLot** / **SupplierInvoice** / **SupplierInvoiceItem** — Import lots ("ล็อตนำเข้า", `/import-lots`): `name` = "เลข Tracking" (known first), `lotNumber` = "เลขล็อต" (assigned later by the forwarder; both prefilled from a linked ChinaShipment's title / containerNo when empty). One lot (optionally linked to a ChinaShipment) holds the Chinese supplier proforma invoices (PI), their lines (supplier code, boxes, Amount ¥, weight kg) and China-side fees. Each line stores `landedTotal` / `landedPerBox` (THB) computed on save by `src/lib/landed-cost.ts`. Replaces the old VendorCost flow (still readable under "ต้นทุนใบสั่งซื้อ (แบบเก่า)")
- **SupplierCodeAlias** — Remembers "supplier code → our product/colour" per supplier so later PIs match automatically
- **EmployeeSalary** — One per Profile: `monthlySalary`, optional `startDate` / `endDate` (pro-rated first/last month), `annualLeaveDays` (paid annual leave/year, default 6). Managed at `/payroll/employees`
- **Payroll** / **PayrollItem** — One payslip per employee per month (`@@unique([profileId, year, month])`) with snapshot rates/totals and `leaveDetails` JSON; items are extra EARNING/DEDUCTION lines. DRAFT → CONFIRMED; confirming posts `netPay` as an `Expense` (`expenseId`). See "Payroll" below
- **CatalogSyncLog** — One row per website sync run (trigger, scope, counters, dry-run `details`)
- **Document** — Quotations and invoices with status workflow (DRAFT → SENT → CONFIRMED → CANCELLED)
- **DocumentLineItem** / **DocumentPaymentTerm** — Cascade-deleted children of Document
- **DocumentCounter** — Per-type, per-month auto-incrementing document numbers

Documents store JSON snapshots of company/customer data at creation time for historical accuracy. Editing a customer (`updateCustomer`) refreshes `customerSnapshot` on all of that customer's documents, and the preview/print pages and `getDocumentForShare` render live company and customer data.

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

`DocumentLineItem.colorVariantSku` snapshots the website colour code (`ProductColorVariant.sku`) when a colour is picked and is printed after the colour name (`สี: สีฟ้า (YSP125-Q302)`); `colorVariantName` stays the bare colour name because stock deduction (`stock-actions.ts`, `data/stock.ts`) matches the variant on it.

### Import Lots & Profit (landed cost)

- Landed cost per PI line = (Amount ¥ + share of that PI's fees) × lot exchange rate + share of the lot's China→Thailand freight (total kg × `ratePerKg`, truck 15 / sea 10 ฿/kg by default, or `freightOverride` = the forwarder's actual bill) + `otherCost`. Shares go by weight when every line has a weight, else by amount; money is split in satang (largest remainder) so lines always sum to the lot total. Pure and unit-tested (`tests/landed-cost.test.ts`, run with `npx tsx --test tests/landed-cost.test.ts`).
- Freight is a product cost, **not** a monthly expense: unsold boxes carry it as stock value until they are sold.
- Code matching (`matchSupplierCodes` in `src/data/import-lots.ts`): alias for this supplier → `ProductColorVariant.sku` (website colour code) → unambiguous alias of another supplier → `Product.sku` → product name containing the code. Codes compare via `normalizeCode` (uppercase alphanumerics).
- Reading a PI (photo or PDF): `extractProformaInvoiceAction(pageUrls)` → `src/lib/pi-extract.ts`, Vercel AI SDK through **Vercel AI Gateway** with open-weight vision models (`PI_EXTRACT_MODEL`, default `google/gemma-4-31b-it`; gateway fallback list `PI_EXTRACT_FALLBACK_MODELS`, default `alibaba/qwen3.8-27b`). PDFs are rendered to one JPEG per page in the browser (`src/lib/pdf-to-images.ts`, pdfjs-dist **legacy** build — the modern build needs JS newer than older phones have; max 6 pages), so any vision model works. A tall single image (a whole PI as one long screenshot) is cut into overlapping slices (`src/lib/image-slices.ts`) because models shrink it until the text is unreadable. Numbers are accepted as strings and cleaned (`toNumber`), an invalid structured answer is parsed from its raw text, and if that still yields no lines the first fallback model is asked for plain JSON. The pages set `maxDuration = 300`. Files upload to `product-images/supplier-invoices/`; `/api/upload` accepts `application/pdf` (magic-byte checked) only in that folder, and the original PDF upload is best-effort (falls back to the first page image). Paste-from-Excel and manual entry work without AI.
- Cost of a sold line (`resolveLineCost`): manual `DocumentLineItem.unitCost` → average landed cost of that colour variant over all lots → of the product → legacy `Product.costPrice × exchangeRate + shippingCostPerBox × weightPerBox`. `updateDocument` carries manual `unitCost` across its delete/recreate of line items.
- `Document.actualDeliveryCost` = what we paid to deliver office → site (a direct cost; `shippingCost` is what the customer is charged). Both are edited on the admin-only "สรุปต้นทุน-กำไร" card under the quotation/invoice form (`DocumentProfitCard`, data in `src/data/document-profit.ts`).
- Dashboard cost = monthly expenses + legacy vendor_costs + cost of sales (COGS + actual delivery) of the confirmed quotations it counts as revenue; quotations already covered by a legacy vendor_costs row are skipped.

### Dashboard Team Calendar

`src/components/dashboard/team-calendar/` — "ปฏิทินทีม" on `/dashboard` for both ADMIN and STAFF (`TeamCalendarSection` server component). Month grid (same grid on mobile, like a phone calendar: multi-day leave and consecutive same-name holidays (e.g. Golden Week) are one bar spanning their days, split at week boundaries; bars packed into lanes with "+N" overflow, `buildWeekRows`) showing company holidays, approved + pending leave (pending drawn dashed) and China shipment milestones; side cards for pending leave approvals (ADMIN) / "การลาของฉัน" (STAFF) and upcoming shipments. Data from `src/data/team-calendar.ts`; month navigation via `fetchTeamCalendarAction`. Mutations call `router.refresh()` and the calendar re-syncs from the new server props.

### Payroll (เงินเดือนพนักงาน)

`/payroll` (under การตั้งค่า, ADMIN only). Pure math in `src/lib/payroll.ts` (`calculatePayroll`), data in `src/data/payroll.ts`, actions in `src/actions/payroll-actions.ts`.
- Every month is 30 days: daily rate = salary ÷ 30, hourly = daily ÷ 8 (9:00–18:00 with a 1h lunch). A full month pays the full salary (28/31-day months too); a month with `startDate`/`endDate` inside it pays daily × calendar days worked (Sundays are **not** removed), capped at 30.
- APPROVED `LeaveRequest`s are counted by the hour (FULL_DAY 8h, MORNING 3h, AFTERNOON 5h) against yearly quotas in `src/lib/leave-policy.ts` (`LEAVE_POLICIES`, `allocateLeaveYear`; Thai labour-law defaults: sick 30 days, personal 3, annual = `annualLeaveDays` from the first anniversary of `startDate`, maternity 120 calendar days with 60 paid, paternity 15, childcare 15 unpaid, sterilisation unlimited, military 60 paid, OTHER unpaid). Leave year = calendar year. Days use up the paid quota in date order; **only hours beyond it are deducted** — except for ADMIN profiles, whose leave is recorded and counted but never deducted (`leaveAlwaysPaid`) (`Payroll.unpaidLeaveHours`, `leaveDetails[].paidHours/unpaidHours`; old payslips without them count every hour as unpaid). Working-day types skip Sundays and COMPANY holidays; maternity/military count calendar days. Payroll therefore reads leave from 1 January up to the month end. Tests: `npx tsx --test tests/leave-policy.test.ts`.
- Leave balances (`src/data/leave-balances.ts`): staff see theirs under "บัญชีของฉัน" (`/profile`: tabs วันลา / สลิปเงินเดือน (own CONFIRMED slips at `/profile/payslips/[id]`) / โปรไฟล์), on the dashboard "การลาของฉัน" card and in the leave dialog (warns when a request goes over quota); ADMIN sees everyone at `/payroll/leave`, and one employee's วันลา / สลิปเงินเดือน (every status, slips open at `/payroll/[id]/slip?from=user`) / โปรไฟล์ (the account form) tabs at `/users/[id]` (shared `LeaveHistoryCard` / `PayslipListCard` in `src/components/profile/`). Payslips print the year's balance as of the month end.
- DRAFT payslips are recalculated from the current salary + leave on every save/confirm. `confirmPayroll` creates an `Expense` in category "เงินเดือนพนักงาน" (`PAYROLL_EXPENSE_CATEGORY`, created on demand) dated the last day of the month, so it flows into `/expenses` and the dashboard expense totals; `unconfirmPayroll` deletes that expense. Printable slip at `/payroll/[id]/slip`.
- Users with payslips cannot be deleted (deactivate instead).

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
- `AI_GATEWAY_API_KEY` — Vercel AI Gateway key for reading PI images (not needed on Vercel when OIDC is enabled); `PI_EXTRACT_MODEL` / `PI_EXTRACT_FALLBACK_MODELS` optionally override the gateway model ids
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
- No test framework is configured; the few tests in `tests/` use `node:test` and run with `npx tsx --test <file>`
