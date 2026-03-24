import { getInStockProducts } from "@/data/stock";
import { getCompanies } from "@/data/companies";
import { StockReportPage } from "@/components/stock/stock-report-page";

export const dynamic = "force-dynamic";

export default async function StockReportRoute() {
  const [products, companies] = await Promise.all([
    getInStockProducts(),
    getCompanies(),
  ]);

  const company = companies[0] ?? null;

  return <StockReportPage company={company} products={products} />;
}
