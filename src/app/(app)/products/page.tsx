import Link from "next/link";
import { Plus, Tags, FileText } from "lucide-react";

import { Status } from "@/generated/prisma/client";
import { getProducts, getProductCategories } from "@/data/products";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/products/product-table";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    categoryId?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status === "ACTIVE" || params.status === "INACTIVE"
    ? (params.status as Status)
    : undefined;

  const [{ products, total }, categories] = await Promise.all([
    getProducts({
      search: params.search,
      status,
      categoryId: params.categoryId,
      page,
      perPage: 10,
    }),
    getProductCategories(),
  ]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สินค้า</h1>
          <p className="text-muted-foreground text-sm">
            จัดการรายการสินค้าทั้งหมด
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/categories">
              <Tags className="size-4" />
              หมวดหมู่
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              href={`/products/summary${
                params.categoryId ? `?categoryId=${params.categoryId}` : ""
              }`}
            >
              <FileText className="size-4" />
              ใบสรุปรายการ
            </Link>
          </Button>
          <Button asChild>
            <Link href="/products/new">
              <Plus className="size-4" />
              เพิ่มสินค้า
            </Link>
          </Button>
        </div>
      </div>

      <ProductTable
        products={products}
        categories={categories}
        total={total}
        page={page}
        totalPages={totalPages}
        filters={{
          search: params.search ?? "",
          status: params.status ?? "",
          categoryId: params.categoryId ?? "",
        }}
      />
    </div>
  );
}
