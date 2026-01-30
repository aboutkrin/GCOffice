import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getProductCategories } from "@/data/products";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/products/product-form";

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categories = await getProductCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มสินค้าใหม่</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลสินค้าด้านล่าง
          </p>
        </div>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
