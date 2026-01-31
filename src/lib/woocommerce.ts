export interface WooCommerceClientConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  sku: string;
  description: string;
  short_description: string;
  regular_price: string;
  price: string;
  status: string;
  images: { id: number; src: string }[];
  categories: { id: number; name: string; slug: string }[];
  dimensions: { length: string; width: string; height: string };
}

function buildClient(config: WooCommerceClientConfig) {
  const baseUrl = config.storeUrl.replace(/\/+$/, "");
  const auth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  async function request<T>(path: string): Promise<{ data: T; headers: Headers }> {
    const url = `${baseUrl}/wp-json/wc/v3${path}`;
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `WooCommerce API error ${res.status}: ${text.slice(0, 200)}`
      );
    }

    const data = (await res.json()) as T;
    return { data, headers: res.headers };
  }

  return { request };
}

export async function testConnection(
  config: WooCommerceClientConfig
): Promise<boolean> {
  const client = buildClient(config);
  await client.request("/system_status");
  return true;
}

export async function getProducts(
  config: WooCommerceClientConfig,
  page: number = 1,
  perPage: number = 100
): Promise<{ products: WooCommerceProduct[]; totalPages: number }> {
  const client = buildClient(config);
  const { data, headers } = await client.request<WooCommerceProduct[]>(
    `/products?page=${page}&per_page=${perPage}&status=any`
  );
  const totalPages = parseInt(headers.get("X-WP-TotalPages") ?? "1", 10);
  return { products: data, totalPages };
}

export async function getAllProducts(
  config: WooCommerceClientConfig
): Promise<WooCommerceProduct[]> {
  const allProducts: WooCommerceProduct[] = [];
  let page = 1;

  while (true) {
    const { products, totalPages } = await getProducts(config, page, 100);
    allProducts.push(...products);
    if (page >= totalPages) break;
    page++;
  }

  return allProducts;
}
