import Link from "next/link";
import { Plus } from "lucide-react";

import { getProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/products/product-table";

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สินค้า</h1>
          <p className="text-muted-foreground text-sm">
            จัดการรายการสินค้าทั้งหมด
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="size-4" />
            เพิ่มสินค้า
          </Link>
        </Button>
      </div>

      <ProductTable products={products} />
    </div>
  );
}
