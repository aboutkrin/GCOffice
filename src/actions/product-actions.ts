"use server";

import { prisma } from "@/lib/prisma";
import { productSchema, updateProductSchema, productCategorySchema, colorVariantInputSchema } from "@/lib/validators";
import { generateProductSku } from "@/lib/sku-generator";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

export async function permanentDeleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
  revalidatePath("/product-costs");
  revalidatePath("/categories");
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

// ============================================================
// COLOR VARIANT ACTIONS
// ============================================================

async function saveColorVariantsInTransaction(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productId: string,
  validated: z.infer<typeof colorVariantInputSchema>[]
) {
  // Get existing variants
  const existing = await tx.productColorVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((v) => v.id));
  const submittedIds = new Set(validated.filter((v) => v.id).map((v) => v.id!));

  // Delete removed variants
  const toDelete = [...existingIds].filter((id) => !submittedIds.has(id));
  if (toDelete.length > 0) {
    await tx.stockMovement.deleteMany({
      where: { colorVariantId: { in: toDelete } },
    });
    await tx.productColorVariant.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  // Upsert variants
  for (const variant of validated) {
    if (variant.id && existingIds.has(variant.id)) {
      await tx.productColorVariant.update({
        where: { id: variant.id },
        data: {
          name: variant.name,
          colorHex: variant.colorHex || null,
          imageUrl: variant.imageUrl || null,
          price: variant.price ?? null,
          sortOrder: variant.sortOrder,
        },
      });
    } else {
      await tx.productColorVariant.create({
        data: {
          productId,
          name: variant.name,
          colorHex: variant.colorHex || null,
          imageUrl: variant.imageUrl || null,
          price: variant.price ?? null,
          sortOrder: variant.sortOrder,
        },
      });
    }
  }

  // Sync aggregate stock
  const result = await tx.productColorVariant.aggregate({
    where: { productId },
    _sum: { stockQuantity: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: result._sum.stockQuantity ?? 0 },
  });
}

export async function saveProductColorVariants(
  productId: string,
  variants: unknown[]
) {
  const validated = z.array(colorVariantInputSchema).parse(variants);

  await prisma.$transaction(async (tx) => {
    await saveColorVariantsInTransaction(tx, productId, validated);
  });

  revalidatePath("/products");
  revalidatePath("/stock");
}

export async function updateProductWithColorVariants(
  id: string,
  data: unknown,
  variants: unknown[]
) {
  const validatedProduct = updateProductSchema.parse(data);
  const validatedVariants = z.array(colorVariantInputSchema).parse(variants);

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: {
        name: validatedProduct.name,
        description: validatedProduct.description,
        categoryId: validatedProduct.categoryId,
        basePrice: validatedProduct.basePrice,
        imageUrl: validatedProduct.imageUrl,
        status: validatedProduct.status,
      },
    });
    await saveColorVariantsInTransaction(tx, id, validatedVariants);
    return updated;
  });

  revalidatePath("/products");
  revalidatePath("/stock");
  return serialize(product);
}

export async function createProductWithColorVariants(
  data: unknown,
  variants: unknown[]
) {
  const validatedProduct = productSchema.parse(data);
  const validatedVariants = z.array(colorVariantInputSchema).parse(variants);

  const product = await prisma.$transaction(async (tx) => {
    const sku = await generateProductSku(validatedProduct.categoryId, tx);
    const created = await tx.product.create({
      data: {
        sku,
        name: validatedProduct.name,
        description: validatedProduct.description,
        categoryId: validatedProduct.categoryId,
        basePrice: validatedProduct.basePrice,
        imageUrl: validatedProduct.imageUrl,
        status: validatedProduct.status,
      },
    });
    if (validatedVariants.length > 0) {
      await saveColorVariantsInTransaction(tx, created.id, validatedVariants);
    }
    return created;
  });

  revalidatePath("/products");
  revalidatePath("/stock");
  return serialize(product);
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
