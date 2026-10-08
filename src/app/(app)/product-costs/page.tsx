import { getProductsForCost, getProductCategories } from "@/data/products";
import { getLandedCostIndex } from "@/data/import-lots";
import { ProductCostTable } from "@/components/product-costs/product-cost-table";

export const dynamic = "force-dynamic";

interface ProductCostsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function ProductCostsPage({ searchParams }: ProductCostsPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);

  const [{ products, total }, categories] = await Promise.all([
    getProductsForCost({
      search: params.search,
      categoryId: params.category,
      page,
      perPage: 20,
    }),
    getProductCategories(),
  ]);

  const totalPages = Math.ceil(total / 20);
  const landed = await getLandedCostIndex(products.map((p) => p.id));
  const productsWithLanded = products.map((p) => ({ ...p, landedCost: landed.byProduct[p.id] ?? null }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ต้นทุนสินค้า</h1>
        <p className="text-muted-foreground text-sm">
          ต้นทุนจากล็อต = เฉลี่ยจากใบ PI ในเมนู &ldquo;ล็อตนำเข้า&rdquo; (แนะนำ) · ช่องอื่นเป็นการกรอกเองแบบเดิม ใช้เมื่อสินค้ายังไม่มีล็อต
        </p>
      </div>

      <ProductCostTable
        products={productsWithLanded}
        total={total}
        page={page}
        totalPages={totalPages}
        search={params.search ?? ""}
        categories={categories}
        selectedCategoryId={params.category ?? ""}
      />
    </div>
  );
}
