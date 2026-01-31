import { prisma } from "@/lib/prisma";
import { Status } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export async function getProducts(params?: {
  search?: string;
  status?: Status;
  categoryId?: string;
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

  const data = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  return serialize(data);
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

export async function searchProducts(query: string) {
  const data = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
  });
  return serialize(data);
}
