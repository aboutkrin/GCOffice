import {
  CATALOG_PRODUCTS_DEFAULT_LIMIT,
  type CatalogCategoriesResponse,
  type CatalogCategory,
  type CatalogHealthResponse,
  type CatalogProduct,
  type CatalogProductResponse,
  type CatalogProductsResponse,
} from "./types";

/**
 * HTTP client for the goodchoiceth.com catalog API (`/api/catalog/*`).
 *
 * Configuration comes from two environment variables only:
 * - `CATALOG_API_URL` — the website origin, e.g. `https://goodchoiceth.com`
 * - `CATALOG_API_KEY` — shared bearer key; also the HMAC secret for webhooks
 */

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Read an env var and scrub a leading UTF-8 BOM (U+FEFF) plus surrounding
 * whitespace. Some dashboards paste the BOM along with the value and an
 * invisible BOM in `CATALOG_API_KEY` makes the HMAC never match.
 */
export function cleanEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export interface CatalogConfig {
  /** Website origin without a trailing slash. */
  baseUrl: string;
  apiKey: string;
}

export function getCatalogConfigOrNull(): CatalogConfig | null {
  const url = cleanEnv("CATALOG_API_URL");
  const apiKey = cleanEnv("CATALOG_API_KEY");
  if (!url || !apiKey) return null;
  return { baseUrl: url.replace(/\/+$/, ""), apiKey };
}

export function getCatalogConfig(): CatalogConfig {
  const config = getCatalogConfigOrNull();
  if (!config) {
    throw new Error(
      "ยังไม่ได้ตั้งค่าการเชื่อมต่อเว็บไซต์ (CATALOG_API_URL / CATALOG_API_KEY)"
    );
  }
  return config;
}

export class CatalogApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CatalogApiError";
    this.status = status;
  }
}

async function catalogFetch<T>(path: string): Promise<T> {
  const { baseUrl, apiKey } = getCatalogConfig();
  const url = `${baseUrl}/api/catalog${path}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new CatalogApiError(
      res.status,
      `Catalog API error ${res.status}: ${text.slice(0, 200)}`
    );
  }

  return (await res.json()) as T;
}

/** Follow `nextCursor` until the feed is exhausted. Includes draft products. */
export async function fetchAllCatalogProducts(): Promise<CatalogProduct[]> {
  const all: CatalogProduct[] = [];
  let cursor: number | null = null;

  while (true) {
    const params = new URLSearchParams({
      limit: String(CATALOG_PRODUCTS_DEFAULT_LIMIT),
    });
    if (cursor !== null) params.set("cursor", String(cursor));

    const page: CatalogProductsResponse = await catalogFetch<CatalogProductsResponse>(
      `/products?${params.toString()}`
    );
    all.push(...page.products);

    if (page.nextCursor === null || page.products.length === 0) break;
    cursor = page.nextCursor;
  }

  return all;
}

/** Returns `null` when the website no longer has the product (404). */
export async function fetchCatalogProduct(
  id: number
): Promise<CatalogProduct | null> {
  try {
    const data = await catalogFetch<CatalogProductResponse>(`/products/${id}`);
    return data.product;
  } catch (err) {
    if (err instanceof CatalogApiError && err.status === 404) return null;
    throw err;
  }
}

export async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  const data = await catalogFetch<CatalogCategoriesResponse>("/categories");
  return data.categories;
}

export async function checkCatalogHealth(): Promise<CatalogHealthResponse> {
  return catalogFetch<CatalogHealthResponse>("/health");
}
