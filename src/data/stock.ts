import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getStockOverview(params?: {
  search?: string;
  categoryId?: string;
  stockFilter?: string;
  page?: number;
  perPage?: number;
}) {
  const where: any = {
    status: "ACTIVE",
  };

  if (params?.categoryId) where.categoryId = params.categoryId;
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.stockFilter === "low_stock") {
    where.stockQuantity = { gt: 0 };
    where.AND = [
      {
        stockQuantity: {
          lte: prisma.product.fields.lowStockThreshold,
        },
      },
    ];
    // Use raw filter for comparing two columns
    delete where.stockQuantity;
    delete where.AND;
    where.AND = [
      { stockQuantity: { gt: 0 } },
      // Prisma doesn't support column-to-column comparison directly,
      // so we'll filter in the application layer below
    ];
  } else if (params?.stockFilter === "out_of_stock") {
    where.stockQuantity = 0;
  }

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 10;

  try {
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          colorVariants: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              colorHex: true,
              imageUrl: true,
              stockQuantity: true,
              lowStockThreshold: true,
            },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.product.count({ where }),
    ]);

    // For low_stock filter, do post-filter (Prisma can't compare two columns)
    let filtered = data;
    if (params?.stockFilter === "low_stock") {
      filtered = data.filter(
        (p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
      );
    }

    return { products: serialize(filtered), total: params?.stockFilter === "low_stock" ? filtered.length : total };
  } catch {
    return { products: [], total: 0 };
  }
}

export async function getStockStats() {
  try {
    const [totalProducts, outOfStock] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.product.count({ where: { status: "ACTIVE", stockQuantity: 0 } }),
    ]);

    // For low stock, we need to fetch and compare columns
    const lowStockProducts = await prisma.product.findMany({
      where: { status: "ACTIVE", stockQuantity: { gt: 0 } },
      select: { stockQuantity: true, lowStockThreshold: true },
    });
    const lowStock = lowStockProducts.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold
    ).length;

    // Calculate total reorder quantity for all products below threshold
    const allBelowThreshold = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { stockQuantity: true, lowStockThreshold: true },
    });
    const totalReorderQuantity = allBelowThreshold.reduce(
      (sum, p) => sum + Math.max(0, p.lowStockThreshold - p.stockQuantity),
      0
    );

    const inStock = totalProducts - outOfStock - lowStock;

    return { totalProducts, inStock, lowStock, outOfStock, totalReorderQuantity };
  } catch {
    return { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalReorderQuantity: 0 };
  }
}

export async function getStockMovements(params?: {
  productId?: string;
  colorVariantId?: string;
  type?: string;
  page?: number;
  perPage?: number;
}) {
  const where: any = {};
  if (params?.productId) where.productId = params.productId;
  if (params?.colorVariantId) where.colorVariantId = params.colorVariantId;
  if (params?.type) where.type = params.type;

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;

  try {
    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, sku: true, name: true, imageUrl: true },
          },
          colorVariant: {
            select: { id: true, name: true, colorHex: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { movements: serialize(data), total };
  } catch {
    return { movements: [], total: 0 };
  }
}

export async function getInStockProducts() {
  try {
    const data = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        stockQuantity: { gt: 0 },
      },
      include: {
        category: true,
        colorVariants: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            colorHex: true,
            imageUrl: true,
            stockQuantity: true,
          },
        },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getProductStock(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        colorVariants: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    return serialize(product);
  } catch {
    return null;
  }
}
