"use server";

import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createProduct(data: unknown) {
  const validated = productSchema.parse(data);
  const product = await prisma.product.create({
    data: {
      sku: validated.sku,
      name: validated.name,
      description: validated.description,
      categoryId: validated.categoryId || undefined,
      width: validated.width,
      height: validated.height,
      sizeUnit: validated.sizeUnit,
      basePrice: validated.basePrice,
      imageUrl: validated.imageUrl,
      status: validated.status,
    },
  });
  revalidatePath("/products");
  return serialize(product);
}

export async function updateProduct(id: string, data: unknown) {
  const validated = productSchema.parse(data);
  const product = await prisma.product.update({
    where: { id },
    data: {
      sku: validated.sku,
      name: validated.name,
      description: validated.description,
      categoryId: validated.categoryId || null,
      width: validated.width,
      height: validated.height,
      sizeUnit: validated.sizeUnit,
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

export async function createProductCategory(name: string) {
  const category = await prisma.productCategory.create({
    data: { name },
  });
  revalidatePath("/products");
  return category;
}

export async function searchProductsAction(query: string) {
  const { searchProducts } = await import("@/data/products");
  return searchProducts(query);
}
