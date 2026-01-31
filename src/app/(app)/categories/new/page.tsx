import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/categories/category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/categories">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มหมวดหมู่ใหม่</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลหมวดหมู่ด้านล่าง
          </p>
        </div>
      </div>

      <CategoryForm />
    </div>
  );
}
