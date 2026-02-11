import { getProductsForSummary, getProductCategories } from "@/data/products";
import { getCompanies } from "@/data/companies";
import { ProductSummaryPreviewPage } from "@/components/preview/product-summary-preview-page";

export const dynamic = "force-dynamic";

interface SummaryPageProps {
  searchParams: Promise<{
    companyId?: string;
    categoryId?: string;
    search?: string;
  }>;
}

export default async function ProductSummaryPage({
  searchParams,
}: SummaryPageProps) {
  const params = await searchParams;

  const [products, companies, categories] = await Promise.all([
    getProductsForSummary({
      categoryId: params.categoryId,
      search: params.search,
    }),
    getCompanies(),
    getProductCategories(),
  ]);

  // Use selected company, or fall back to the first active company
  const company = params.companyId
    ? companies.find((c: any) => c.id === params.companyId) ?? companies[0]
    : companies[0];

  const category = params.categoryId
    ? categories.find((c: any) => c.id === params.categoryId)
    : undefined;

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">
          กรุณาเพิ่มข้อมูลบริษัทก่อนใช้งาน
        </p>
      </div>
    );
  }

  const data = {
    company: {
      name: company.name,
      address: company.address,
      taxId: company.taxId ?? undefined,
      phone: company.phone ?? undefined,
      email: company.email ?? undefined,
      facebook: company.facebook ?? undefined,
      lineOa: company.lineOa ?? undefined,
      tiktok: company.tiktok ?? undefined,
      logoUrl: company.logoUrl ?? undefined,
    },
    products: products.map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      imageUrl: p.imageUrl,
      basePrice: p.basePrice,
      category: p.category ? { name: p.category.name } : null,
    })),
    categoryName: category?.name,
  };

  return <ProductSummaryPreviewPage data={data} />;
}
