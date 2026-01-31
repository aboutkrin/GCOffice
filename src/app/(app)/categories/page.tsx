import Link from "next/link";
import { Plus } from "lucide-react";

import { getProductCategories } from "@/data/products";
import { Button } from "@/components/ui/button";
import { CategoryTable } from "@/components/categories/category-table";

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getProductCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">หมวดหมู่สินค้า</h1>
          <p className="text-muted-foreground text-sm">
            จัดการหมวดหมู่และรหัสนำหน้าสินค้า
          </p>
        </div>
        <Button asChild>
          <Link href="/categories/new">
            <Plus className="size-4" />
            เพิ่มหมวดหมู่
          </Link>
        </Button>
      </div>

      <CategoryTable categories={categories} />
    </div>
  );
}
