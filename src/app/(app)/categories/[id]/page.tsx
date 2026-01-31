import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProductCategoryById } from "@/data/products";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/categories/category-form";

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const category = await getProductCategoryById(id);

  if (!category) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/categories">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขหมวดหมู่</h1>
          <p className="text-muted-foreground text-sm">{category.name}</p>
        </div>
      </div>

      <CategoryForm initialData={category} />
    </div>
  );
}
