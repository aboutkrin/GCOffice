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
- `src/app/api/` — API routes for file uploads and document status updates
- `middleware.ts` — Supabase auth middleware; redirects unauthenticated users to `/login`

### Data Flow

1. **Server Actions** (`src/actions/`) — Handle all mutations (create/update/delete) for auth, companies, customers, products, documents
2. **Data Layer** (`src/data/`) — Server-side query functions for fetching lists, stats, and detail views
3. **Validation** (`src/lib/validators.ts`) — Zod schemas with Thai error messages, shared between client forms and server actions
4. **Components** — Server Components by default; `"use client"` only for interactive forms

### Database (Prisma + PostgreSQL)

Schema at `prisma/schema.prisma`. Key models:
- **Profile** — Synced from Supabase auth.users via DB trigger
- **Company** — Business entities with logo, bank details, VAT config
- **Customer** — COMPANY or INDIVIDUAL type, with lead source tracking
- **Product** — SKU-based catalog with categories, images, dimensions, pricing
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
- **Tailwind CSS v4** — styling
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

### Custom Hooks

- `use-line-items.ts` — Manage document line item state
- `use-payment-terms.ts` — Manage payment term state
- `use-pricing.ts` — Calculate discount, VAT, and totals

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin key (server-only)

## Key Conventions

- Path alias: `@/*` maps to `src/*`
- `src/lib/utils.ts` exports `cn()` (clsx + tailwind-merge) and `serialize()` for Prisma Decimal-to-plain conversion
- All user-facing text is in Thai
- Zod validation error messages are in Thai
- Icons from `lucide-react`
