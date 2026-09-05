import { prisma } from "@/lib/prisma";
import { Status } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export async function getProducts(params?: {
  search?: string;
  status?: Status;
  categoryId?: string;
  page?: number;
  perPage?: number;
}) {
  const where: any = {};
  if (params?.status) where.status = params.status;
  if (params?.categoryId) where.categoryId = params.categoryId;
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 10;

  try {
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          _count: { select: { colorVariants: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.product.count({ where }),
    ]);

    return { products: serialize(data), total };
  } catch {
    return { products: [], total: 0 };
  }
}

export async function getProductById(id: string) {
  try {
    const data = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        colorVariants: { orderBy: { sortOrder: "asc" } },
      },
    });
    return serialize(data);
  } catch {
    return null;
  }
}

export async function getProductCategories() {
  try {
    const data = await prisma.productCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getProductCategoryById(id: string) {
  try {
    const data = await prisma.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    return serialize(data);
  } catch {
    return null;
  }
}

export async function searchProducts(query: string, categoryId?: string) {
  const where: any = {
    status: "ACTIVE",
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ];
  }

  try {
    const data = await prisma.product.findMany({
      where,
      include: {
        colorVariants: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            colorHex: true,
            imageUrl: true,
            price: true,
            stockQuantity: true,
            websiteActive: true,
            websiteVariantId: true,
          },
        },
      },
      take: 20,
      orderBy: { name: "asc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export interface ProductForCost {
  id: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  costPrice: number | null;
  exchangeRate: number | null;
  weightPerBox: number | null;
  shippingCostPerBox: number | null;
}

export async function getProductsForCost(params?: {
  search?: string;
  categoryId?: string;
  page?: number;
  perPage?: number;
}): Promise<{ products: ProductForCost[]; total: number }> {
  const where: any = {
    status: "ACTIVE",
  };

  if (params?.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;

  try {
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          imageUrl: true,
          basePrice: true,
          costPrice: true,
          exchangeRate: true,
          weightPerBox: true,
          shippingCostPerBox: true,
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.product.count({ where }),
    ]);

    return { products: serialize(data) as unknown as ProductForCost[], total };
  } catch {
    return { products: [], total: 0 };
  }
}
