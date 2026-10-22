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
- **Profile** — Synced from Supabase auth.users via DB trigger. `bankName` / `bankAccountName` / `bankAccountNumber` = the employee's own salary account, entered by the employee on `/profile` (โปรไฟล์ tab) and printed on payslips
- **Company** — Business entities with logo, bank details, VAT config
- **Customer** — COMPANY or INDIVIDUAL type, with lead source tracking
- **Product** — SKU-based catalog with categories, images, dimensions, pricing, cost fields and stock. `source` is `MANUAL` (created in GCOffice), `WEBSITE` (mirrored from goodchoiceth.com) or `WOOCOMMERCE` (legacy rows from the retired WooCommerce sync; `woocommerceId` is kept only to match website products by `wpPostId`)
- **ProductColorVariant** — Colour variants per product (name unique per product, colourHex, imageUrl, price, stock). Rows with `websiteVariantId` are website-owned; `websiteActive === false` renders the badge "ไม่แสดงบนเว็บ" but the colour stays selectable in documents
- **StockMovement** — IN/OUT/ADJUSTMENT/INITIAL movements per product or colour variant. `Product.stockQuantity` is the sum of its variants' stock once variants exist. `src/data/stock.ts` aggregates by `productSku`, so **existing SKUs must never be rewritten**
- **Holiday** — Holidays (admin-managed at `/holidays`), `type` COMPANY (office closed — red on calendars), PUBLIC (general public holiday the office still works — grey, reference only) or CHINA (Chinese holiday, e.g. Golden Week — red dashed; office works but China doesn't ship). All types are skipped by delivery-date math because carriers are closed / China doesn't ship. The office works Mon–Sat: only Sunday is a weekend (red) on calendars and in `delivery-date.ts`. Drives working-day math for delivery dates (`src/lib/delivery-date.ts`), so **employee leave must never be stored here**. Stored one row per day; consecutive days with the same name/type/recurrence are shown and edited as one group (`src/lib/holiday-groups.ts`, `updateHolidayGroup` replaces the group's rows with the edited range)
- **LeaveRequest** — Employee leave (type SICK/PERSONAL/ANNUAL/MATERNITY/PATERNITY/CHILDCARE/STERILIZATION/MILITARY/OTHER (= unpaid), FULL_DAY/MORNING/AFTERNOON, status PENDING → APPROVED/REJECTED, or CANCELLED). STAFF request for themselves (PENDING); ADMIN can record leave for anyone (auto-APPROVED) and approve/reject. Actions in `src/actions/leave-actions.ts`
- **ChinaShipment** — Shipments from China: `title` = "เลข Tracking / รายการสินค้า" (shown on the calendar), `containerNo` = "เลขล็อต"; shippedDate, etaDate, arrivedDate, receivedDate with status SHIPPED → ARRIVED_TH → RECEIVED (or CANCELLED). `imageUrls` = photos of the goods in the lot (up to 12, uploaded to `product-images/china-shipments/`), shown as thumbnails with a full-size viewer on the calendar day view and the "ของจากจีนที่กำลังมา" card (`shipment-images.tsx`). Any user can add/advance; only ADMIN can delete. Actions in `src/actions/china-shipment-actions.ts`
- **CustomerAppointment** — "นัดพบลูกค้า" on the team calendar: `kind` VISIT_CUSTOMER (we go to the customer, teal), SHOWROOM (the customer comes to see products at the showroom, pink; the form hides location/mapUrl and the attendee is "ผู้รับนัด") or PICKUP (the customer collects goods at the showroom, yellow; same rules as SHOWROOM, plus optional `documentId` → a CONFIRMED/SHIPPED quotation picked in the dialog (`searchQuotationsForAppointmentAction`), which prefills customer/contact and is shown as a link with a short item list; listed in its own "รับสินค้าที่โชว์รูม" card, never in the นัดพบลูกค้า card), `companyName` (free text, optionally linked to a `Customer` via `customerId`, which prefills name/address), `location`, `mapUrl` (Google Maps link, shown as a tappable "เปิดแผนที่"), `contactName` / `contactPhone` (the customer's contact person, phone rendered as a `tel:` link; prefilled from the linked customer's `contactPerson` / `phone`), `date` + `startTime`/`endTime` ("HH:mm" strings), `attendeeId` (an ACTIVE user: VISIT_CUSTOMER requires an ADMIN; SHOWROOM and PICKUP may also be received by STAFF). Anyone can book one; if the booker is the attendee, or the attendee is STAFF (showroom only), it is CONFIRMED at once, otherwise (booked for another ADMIN) PENDING until any ADMIN confirms (ว่าง → CONFIRMED) or declines (ไม่ว่าง → DECLINED). Editing the date/time/attendee of a CONFIRMED appointment sends it back to PENDING unless the editor is the attendee or the attendee is STAFF. `completedAt` / `completedById` = the appointment happened: the "รับสินค้าแล้ว" (PICKUP) / "มาชมแล้ว" (SHOWROOM) / "พบลูกค้าแล้ว" (VISIT_CUSTOMER) button (`AppointmentDoneButton`, `setAppointmentCompleted`; creator, attendee or ADMIN, CONFIRMED only, status is unchanged, undo arrow) shows a green label and the side cards sink it under an "เสร็จแล้ว" divider. Actions in `src/actions/appointment-actions.ts`
- **ImportLot** / **SupplierInvoice** / **SupplierInvoiceItem** — Import lots ("ล็อตนำเข้า", `/import-lots`): `name` = "เลข Tracking" (known first), `lotNumber` = "เลขล็อต" (assigned later by the forwarder; both prefilled from a linked ChinaShipment's title / containerNo when empty). One lot (optionally linked to a ChinaShipment) holds the Chinese supplier proforma invoices (PI), their lines (supplier code, boxes, Amount ¥, weight kg) and China-side fees. Each line stores `landedTotal` / `landedPerBox` (THB) computed on save by `src/lib/landed-cost.ts`. Replaces the old VendorCost flow (its pages were removed; existing `vendor_costs` rows are still counted by the dashboard and excluded from the profit report)
- **SupplierCodeAlias** — Remembers "supplier code → our product/colour" per supplier so later PIs match automatically
- **EmployeeSalary** — One per Profile: `monthlySalary`, optional `startDate` / `endDate` (pro-rated first/last month), `annualLeaveDays` (paid annual leave/year, default 6). Managed at `/payroll/employees`
- **Payroll** / **PayrollItem** — One payslip per employee per month (`@@unique([profileId, year, month])`) with snapshot rates/totals and `leaveDetails` JSON; items are extra EARNING/DEDUCTION lines. DRAFT → CONFIRMED; confirming posts `netPay` as an `Expense` (`expenseId`). See "Payroll" below
- **CatalogSyncLog** — One row per website sync run (trigger, scope, counters, dry-run `details`)
- **Document** — Quotations and invoices with status workflow (DRAFT → SENT → CONFIRMED → CANCELLED)
  - **Invoice billing types** (`invoiceBillingType`, same `ReceiptPaymentType` enum as receipts; `invoiceBillingSummary` JSON snapshot `{quotationNumber, quotationTotal, previousDeposits, billedAmount, remainingBalance}`): an invoice is issued off a CONFIRMED quotation as FULL (the whole quotation, editable form as before), DEPOSIT (มัดจำ: ฿ / % / a quotation payment term; one generated line `เรียกเก็บเงินมัดจำ ตามใบเสนอราคาเลขที่ …` with VAT prorated, several allowed, auto INV number) or BALANCE (ยอดคงเหลือ: same shape as a deposit invoice, one generated line `เรียกเก็บยอดคงเหลือ ตามใบเสนอราคาเลขที่ …` for the remainder; the deposits are only shown in the printed summary box, not as deduction rows). Pure math in `src/lib/invoice-billing.ts` (wraps `calculateReceiptPayment`, tests `tests/invoice-billing.test.ts`), server in `src/lib/invoice-billing-server.ts` (`issuedDepositInvoices`, `hasFinalInvoice`, `applyInvoiceBilling`; the quotation row is locked with `lockDocument`). A quotation stays selectable until a non-cancelled FULL/BALANCE invoice exists; a deposit invoice cannot be cancelled while the balance invoice exists. Both print the same layout: the quotation's product images box, then one row in the same two columns as the รวมทั้งสิ้น row: the company bank box (`BankInfoBox` compact) on the left, the billing box (ยอดใบเสนอราคา / มัดจำแล้ว / เรียกเก็บครั้งนี้ / คงเหลือ) on the right, then plain totals; no payment-terms table, delivery dates or payment-record box. Form panel `InvoiceBillingPanel`; list badge มัดจำ / ยอดคงเหลือ and the "ออกใบแจ้งหนี้ยอดคงเหลือ" shortcut (`/invoices/new?quotationId=`). Receipts are unchanged: a FULL receipt on a deposit invoice pays the deposit, on the balance invoice pays `netPayable`. `null` = legacy invoice (treated as FULL); legacy `isDepositInvoice` rows still render but new ones are blocked.
  - **Payment record** (`paymentMethod` = existing `PaymentMethod` enum, `paymentReference`, `paymentDate`): how the customer actually paid. On the invoice list choosing ชำระแล้ว / มัดจำแล้ว opens `PaymentRecordDialog` (`recordInvoicePayment`), shown as "โอนเงิน · 16 ต.ค. 69" under the status badge; receipts pick it in the form (`PaymentMethodChips`) and `syncInvoicePaymentStatus` copies the newest receipt's channel onto the invoice when it has none. Printed in `PreviewPayment` ("ช่องทางการชำระ"). The channel the customer is asked to pay into is always the company's bank box from the quotation's company — never chosen per invoice.
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
- Cost of a sold line (`resolveLineCost`, pure in `src/lib/line-cost.ts`, tests `tests/line-cost.test.ts`): manual `DocumentLineItem.unitCost` → `costSnapshot` → average landed cost of that colour variant over all lots (weighted average, no per-lot picking) → of the product → legacy `Product.costPrice × exchangeRate + shippingCostPerBox × weightPerBox`. `updateDocument` carries `unitCost` and `costSnapshot` across its delete/recreate of line items.
- `costSnapshot` locks today's average when a quotation becomes CONFIRMED/SHIPPED (`lockDocumentLineCosts` in `src/data/document-profit.ts`, also for lines added while editing a sold quotation) and is cleared when it goes back to DRAFT/QUOTED, so a new import lot never changes the profit of bills already sold. The profit card's "คำนวณต้นทุนใหม่จากล็อตล่าสุด" (`relockDocumentCosts`) re-locks every line. Bills confirmed before the column existed follow the live average until re-locked.
- `/profit-report` ("กำไรต่อบิล", ADMIN): profit and margin % per sold quotation for a month/year (same bills and dates as the dashboard's cost of sales; bills costed on legacy vendor_costs are left out), expandable per-line cost and source, plus "มูลค่าสต็อกคงเหลือ" = stock on hand × average landed cost (`getInventoryValue` in `src/data/profit-report.ts`) — the unsold part of the import lots.
- `Document.actualDeliveryCost` = what we paid to deliver office → site (a direct cost; `shippingCost` is what the customer is charged). Both are edited on the admin-only "สรุปต้นทุน-กำไร" card under the quotation/invoice form (`DocumentProfitCard`, data in `src/data/document-profit.ts`). Each line's "จากล็อต" button (`LotCostPicker`, `searchLotItemsForCostAction`) lists lot lines matched to that product (its colour first) or found by code/lot/supplier search; several can be picked with a box count each (e.g. 5 boxes from this lot + 1 left from an older one) and the manual cost becomes the box-weighted average (`blendLotCost` in `src/lib/line-cost.ts`, recomputed server-side in `updateDocumentCosts`); the split is saved as a JSON snapshot in `DocumentLineItem.costBreakdown` (shown instead of "กรอกเอง" on the card and in `/profit-report`, carried by `updateDocument`, cleared when the cost is typed by hand), and an unmatched lot line can be linked to the product at the same time (`linkLotItemToProduct`, also saves the supplier alias).
- Dashboard cost = monthly expenses + legacy vendor_costs + cost of sales (COGS + actual delivery) of the confirmed quotations it counts as revenue; quotations already covered by a legacy vendor_costs row are skipped.
- Dashboard finance (`src/data/finance.ts`, pure math in `src/lib/finance.ts`, tests `tests/finance.test.ts`): one breakdown per month shared by the dashboard chart (`getMonthlyRevenueAndCost` → `getFinanceYear`) and the month page. revenue − productCost (COGS + actual delivery + legacy vendor_costs) = grossProfit − operatingExpense (/expenses, payroll included) = netProfit. The chart stacks ต้นทุนสินค้า+ค่าส่ง with ค่าใช้จ่ายประจำ; clicking a bar or a month row opens `/dashboard/finance/[year]/[month]` (`financeMonthHref`, ADMIN): net profit vs last month, the statement with drill-downs, a warning for bills missing cost, "เงินเข้าจริง / ค้างรับ" (PAID receipts by `paymentDate ?? documentDate`; outstanding = quotation grandTotal − PAID receipts of its non-cancelled invoices), "ซื้อสินค้าเข้าล็อต" (import lots by `orderDate`, info only, not subtracted) and tabs of bills / expenses.

### Delivery Notes (ใบส่งสินค้า)

A delivery note is not a `Document` type: it is an ISSUE `StockDocument` with a `sourceDocumentId` (an issue against a quotation). One posted issue is one delivery round, so partial deliveries are several issues, and posting it cuts stock.
- Start a round from the quotation page's "การส่งสินค้า" card (`QuotationDeliveryCard`, CONFIRMED/SHIPPED quotations) or "เบิกตามเอกสาร". `createIssueFromDocument` prefills every outstanding line at 0 plus the delivery fields: site address from `shippingLocation` → customer address, contact from the customer, and PO and transport from the previous round.
- `postStockDocument` drops lines left at 0 in a delivery round. It assigns `deliveryNumber` `DN-YYMM-NNNN` (`generateDeliveryNoteNumber`, `DeliveryNoteCounter`) in the same transaction, so drafts never use up a number.
- The delivery fields (`deliveryAddress`, `deliveryContactName/Phone`, `customerPoNumber`, `vehiclePlate`, `driverName`, `driverPhone`, `carrierName`, `deliveryRemark`) are edited on the issue page (`DeliveryInfoCard`, `updateDeliveryInfo`), even after posting.
- `/delivery-notes` (menu เอกสาร → ใบส่งสินค้า, `getDeliveryNotes`) lists every delivery round (ISSUE with a `sourceDocumentId`, drafts included) with customer, quotation, status and a print button; search by DN / issue number / quotation number / customer / PO.
- `/stock/issue/[id]/delivery-note` (`getDeliveryNote` in `src/data/delivery-notes.ts`) prints two A4 copies (ต้นฉบับ for the customer, สำเนา to be signed and brought back) with no prices. Each line shows ordered / shipped this round / unit / m² / still to ship, counting rounds posted up to and including this one, plus three signature boxes. A draft or cancelled note shows a watermark.

### Dashboard Team Calendar

`src/components/dashboard/team-calendar/` — "ปฏิทินทีม" on `/dashboard` for both ADMIN and STAFF (`TeamCalendarSection` server component). Month grid (same grid on mobile, like a phone calendar: multi-day leave and consecutive same-name holidays (e.g. Golden Week) are one bar spanning their days, split at week boundaries; bars packed into lanes with "+N" overflow, `buildWeekRows`) showing company holidays, approved + pending leave (pending drawn dashed), China shipment milestones and customer appointments (teal, dashed while PENDING, label `HH:mm company (attendee)`); on wide screens the grid takes two thirds of the width with the "ของจากจีนที่กำลังมา" card beside it on the right and the other three cards in one row underneath (phones and tablets stack the grid, then the shipments card, then the rest one under the other), in this order: "ของจากจีนที่กำลังมา" (`UpcomingShipmentsCard`: every SHIPPED/ARRIVED_TH shipment plus RECEIVED ones received within the last 30 days (`RECEIVED_SHIPMENT_VISIBLE_DAYS` in `getUpcomingShipments`; receiving goods must not remove the lot from the card), newest lot (`createdAt`) first, only 4 rows visible and the rest scroll inside the card — the height of the first 4 rows is measured, not fixed), then one "นัดพบลูกค้า" card (`AppointmentsCard`: scoped to the month shown on the grid and changes with the ‹ › navigation; a "รอยืนยัน" section with the ว่าง/ไม่ว่าง buttons — every PENDING appointment of the month for ADMIN, the viewer's own PENDING/DECLINED ones for STAFF — followed by "นัดที่ยืนยันแล้ว" = the team's CONFIRMED appointments of that month with a วันนี้ / อีก N วัน / ผ่านมาแล้ว countdown, nearest upcoming first, the past ones under a "ผ่านมาแล้ว" divider and the done ones (`completedAt`) under an "เสร็จแล้ว" divider at the bottom (`splitUpcomingPast`); only the first 2 rows are visible (`APPOINTMENT_ROWS_VISIBLE`, measured by the shared `useVisibleRows` hook like the shipments card) and the rest scroll inside the card), then a yellow "รับสินค้าที่โชว์รูม" card (`PickupCard`: the same layout for PICKUP appointments only, each row linking to the quotation being collected; both appointment cards stretch to the same height in their grid row), then "คำขอลารออนุมัติ" (ADMIN) / "การลาของฉัน" (STAFF). `TeamCalendarBoard` (client) owns the year/month/data state and renders the grid and the appointments card from the same `getTeamCalendar` result (which also returns DECLINED appointments for the card; the grid skips them). `AppointmentDialog` (`appointment-dialog.tsx`) has a customer search popover (`searchCustomersForAppointmentAction`), an attendee picker (`getAppointmentAttendees`: every ACTIVE user with role; the list is admin-only unless the kind is SHOWROOM) and click-to-pick time fields (`TimePickerButton`: quick chips, hour grid, 5-minute grid, no typing). Data from `src/data/team-calendar.ts`; month navigation via `fetchTeamCalendarAction`. Mutations call `router.refresh()` and the board re-syncs from the new server props.

### Payroll (เงินเดือนพนักงาน)

`/payroll` (under การตั้งค่า, ADMIN only). Pure math in `src/lib/payroll.ts` (`calculatePayroll`), data in `src/data/payroll.ts`, actions in `src/actions/payroll-actions.ts`.
- Every month is 30 days: daily rate = salary ÷ 30, hourly = daily ÷ 8 (9:00–18:00 with a 1h lunch). A full month pays the full salary (28/31-day months too); a month with `startDate`/`endDate` inside it pays daily × calendar days worked (Sundays are **not** removed), capped at 30.
- APPROVED `LeaveRequest`s are counted by the hour (FULL_DAY 8h, MORNING 3h, AFTERNOON 5h) against yearly quotas in `src/lib/leave-policy.ts` (`LEAVE_POLICIES`, `allocateLeaveYear`; Thai labour-law defaults: sick 30 days, personal 3, annual = `annualLeaveDays` from the first anniversary of `startDate`, maternity 120 calendar days with 60 paid, paternity 15, childcare 15 unpaid, sterilisation unlimited, military 60 paid, OTHER unpaid). Leave year = calendar year. Days use up the paid quota in date order; **only hours beyond it are deducted** — except for ADMIN profiles, whose leave is recorded and counted but never deducted (`leaveAlwaysPaid`) (`Payroll.unpaidLeaveHours`, `leaveDetails[].paidHours/unpaidHours`; old payslips without them count every hour as unpaid). Working-day types skip Sundays and COMPANY holidays; maternity/military count calendar days. Payroll therefore reads leave from 1 January up to the month end. Tests: `npx tsx --test tests/leave-policy.test.ts`.
- Leave balances (`src/data/leave-balances.ts`): staff see theirs under "บัญชีของฉัน" (`/profile`: tabs วันลา / สลิปเงินเดือน (own CONFIRMED slips at `/profile/payslips/[id]`) / โปรไฟล์), on the dashboard "การลาของฉัน" card and in the leave dialog (warns when a request goes over quota); ADMIN sees everyone at `/payroll/leave`, and one employee's วันลา / สลิปเงินเดือน (every status, slips open at `/payroll/[id]/slip?from=user`) / โปรไฟล์ (the account form) tabs at `/users/[id]` (shared `LeaveHistoryCard` / `PayslipListCard` in `src/components/profile/`).
- DRAFT payslips are recalculated from the current salary + leave on every save/confirm. `confirmPayroll` creates an `Expense` in category "เงินเดือนพนักงาน" (`PAYROLL_EXPENSE_CATEGORY`, created on demand) dated the last day of the month, so it flows into `/expenses` and the dashboard expense totals; `unconfirmPayroll` deletes that expense. Printable slip at `/payroll/[id]/slip`.
- `/payroll/summary` ("สรุปเงินเดือนพนักงาน", `getPayrollYearSummary`): employee × month grid for a year — green = CONFIRMED (paid, opens the slip), amber = DRAFT (opens the editor), dashed "ยังไม่ทำ" = employed in a month that has started but no payslip (links to `/payroll?year&month`), with per-employee and per-month paid totals.
- Users with payslips cannot be deleted (deactivate instead).

### Monthly Expenses (ค่าใช้จ่ายรายเดือน)

`/expenses` (ADMIN) is one client page, `ExpenseBoard` (`src/components/expenses/expense-board.tsx`): month switcher, total / change vs the previous period / count, a per-category breakdown bar (chips filter the list) and the list grouped by day. Adding and editing happen in `ExpenseSheet` (side sheet, bottom sheet on mobile; amount first, name suggestions from `getExpenseQuickData`, category chips with inline "หมวดใหม่", "บันทึกและเพิ่มต่อ"; key `N` opens it). "คัดลอกจากเดือนก่อน" (`ExpenseCopyDialog` → `copyExpenses`) copies chosen rows of last month to the same day this month. `/expenses/new` and `/expenses/[id]/edit` redirect to `/expenses?add=1` / `?edit=<id>`. Expenses posted by a confirmed payslip are read-only (`updateExpense`/`deleteExpense` refuse them; edit via payroll). Category colours come from list order (`buildCategoryColors`), no DB field.

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
