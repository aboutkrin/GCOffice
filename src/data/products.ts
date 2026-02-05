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

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return { products: serialize(data), total };
}

export async function getProductById(id: string) {
  const data = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  return serialize(data);
}

export async function getProductCategories() {
  return prisma.productCategory.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getProductCategoryById(id: string) {
  return prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
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

  const data = await prisma.product.findMany({
    where,
    take: 20,
    orderBy: { name: "asc" },
  });
  return serialize(data);
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
  page?: number;
  perPage?: number;
}): Promise<{ products: ProductForCost[]; total: number }> {
  const where: any = {
    status: "ACTIVE",
  };

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;

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

  return { products: serialize(data), total };
}
