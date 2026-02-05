"use server";

import { prisma } from "@/lib/prisma";
import { productSchema, updateProductSchema, productCategorySchema } from "@/lib/validators";
import { generateProductSku } from "@/lib/sku-generator";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createProduct(data: unknown) {
  const validated = productSchema.parse(data);
  const product = await prisma.$transaction(async (tx) => {
    const sku = await generateProductSku(validated.categoryId, tx);
    return tx.product.create({
      data: {
        sku,
        name: validated.name,
        description: validated.description,
        categoryId: validated.categoryId,
        basePrice: validated.basePrice,
        imageUrl: validated.imageUrl,
        status: validated.status,
      },
    });
  });
  revalidatePath("/products");
  return serialize(product);
}

export async function updateProduct(id: string, data: unknown) {
  const validated = updateProductSchema.parse(data);
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: validated.name,
      description: validated.description,
      categoryId: validated.categoryId,
      basePrice: validated.basePrice,
      imageUrl: validated.imageUrl,
      status: validated.status,
    },
  });
  revalidatePath("/products");
  return serialize(product);
}

export async function deleteProduct(id: string) {
  await prisma.product.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  revalidatePath("/products");
}

export async function createProductCategory(data: unknown) {
  const validated = productCategorySchema.parse(data);
  const category = await prisma.productCategory.create({
    data: {
      name: validated.name,
      prefix: validated.prefix,
    },
  });
  revalidatePath("/products");
  revalidatePath("/categories");
  return category;
}

export async function updateProductCategory(id: string, data: unknown) {
  const validated = productCategorySchema.parse(data);

  const existing = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!existing) {
    throw new Error("ไม่พบหมวดหมู่");
  }

  if (existing._count.products > 0 && existing.prefix !== validated.prefix) {
    throw new Error("ไม่สามารถเปลี่ยนรหัสนำหน้าได้เนื่องจากมีสินค้าในหมวดหมู่นี้แล้ว");
  }

  const category = await prisma.productCategory.update({
    where: { id },
    data: {
      name: validated.name,
      prefix: validated.prefix,
    },
  });
  revalidatePath("/products");
  revalidatePath("/categories");
  return category;
}

export async function deleteProductCategory(
  id: string,
  options?: { forceDeleteProducts?: boolean }
) {
  const existing = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!existing) {
    throw new Error("ไม่พบหมวดหมู่");
  }

  if (existing._count.products > 0 && !options?.forceDeleteProducts) {
    throw new Error("ไม่สามารถลบหมวดหมู่ได้เนื่องจากมีสินค้าในหมวดหมู่นี้อยู่");
  }

  await prisma.$transaction(async (tx) => {
    if (existing._count.products > 0) {
      await tx.product.deleteMany({ where: { categoryId: id } });
    }
    await tx.productCategory.delete({ where: { id } });
  });

  revalidatePath("/products");
  revalidatePath("/product-costs");
  revalidatePath("/categories");
}

export async function searchProductsAction(query: string, categoryId?: string) {
  const { searchProducts } = await import("@/data/products");
  return searchProducts(query, categoryId);
}

export async function getProductCategoriesAction() {
  const { getProductCategories } = await import("@/data/products");
  return getProductCategories();
}

export async function updateProductCost(
  id: string,
  data: {
    costPrice?: number | null;
    exchangeRate?: number | null;
    weightPerBox?: number | null;
    shippingCostPerBox?: number | null;
  }
) {
  const product = await prisma.product.update({
    where: { id },
    data: {
      costPrice: data.costPrice ?? null,
      exchangeRate: data.exchangeRate ?? null,
      weightPerBox: data.weightPerBox ?? null,
      shippingCostPerBox: data.shippingCostPerBox ?? null,
    },
  });
  revalidatePath("/product-costs");
  return serialize(product);
}
