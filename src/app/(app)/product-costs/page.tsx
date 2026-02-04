import { getProductsForCost } from "@/data/products";
import { ProductCostTable } from "@/components/product-costs/product-cost-table";

export const dynamic = "force-dynamic";

interface ProductCostsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function ProductCostsPage({ searchParams }: ProductCostsPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);

  const { products, total } = await getProductsForCost({
    search: params.search,
    page,
    perPage: 20,
  });

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ต้นทุนสินค้า</h1>
        <p className="text-muted-foreground text-sm">
          จัดการข้อมูลต้นทุนและค่าขนส่งสินค้า
        </p>
      </div>

      <ProductCostTable
        products={products}
        total={total}
        page={page}
        totalPages={totalPages}
        search={params.search ?? ""}
      />
    </div>
  );
}
