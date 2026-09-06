import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProductById, getProductCategories } from "@/data/products";
import { getCatalogBaseUrl } from "@/lib/catalog/client";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/products/product-form";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    getProductCategories(),
  ]);

  if (!product) {
    notFound();
  }

  // Website-sourced products are edited on goodchoiceth.com; link straight to the admin page
  // (and to the public product page, which needs no admin login).
  const catalogBaseUrl = getCatalogBaseUrl();
  const websiteAdminUrl =
    product.source === "WEBSITE" && product.websiteProductId != null && catalogBaseUrl
      ? `${catalogBaseUrl}/admin/products/${product.websiteProductId}`
      : null;
  const websitePublicUrl =
    product.source === "WEBSITE" && product.websiteSlug && catalogBaseUrl
      ? `${catalogBaseUrl}/products/${product.websiteSlug}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขสินค้า</h1>
          <p className="text-muted-foreground text-sm">{product.name}</p>
        </div>
      </div>

      <ProductForm
        initialData={product}
        categories={categories}
        websiteAdminUrl={websiteAdminUrl}
        websitePublicUrl={websitePublicUrl}
      />
    </div>
  );
}
