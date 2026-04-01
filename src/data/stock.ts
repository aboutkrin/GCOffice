import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { DocumentStatus, DocumentType } from "@/generated/prisma/client";

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

export async function getInventorySummary() {
  try {
    // 1. Fetch all confirmed/shipped quotations with line items
    const documents = await prisma.document.findMany({
      where: {
        type: DocumentType.QUOTATION,
        status: { in: [DocumentStatus.CONFIRMED, DocumentStatus.SHIPPED] },
      },
      select: {
        id: true,
        documentNumber: true,
        documentDate: true,
        customerSnapshot: true,
        lineItems: {
          select: {
            productSku: true,
            productName: true,
            productImage: true,
            colorVariantName: true,
            quantity: true,
          },
        },
      },
    });

    // 2. Collect all unique product SKUs from line items
    const skuSet = new Set<string>();
    for (const doc of documents) {
      for (const item of doc.lineItems) {
        if (item.productSku) skuSet.add(item.productSku);
      }
    }

    // 3. Fetch current stock for these products
    const products = await prisma.product.findMany({
      where: { sku: { in: Array.from(skuSet) } },
      select: {
        id: true,
        sku: true,
        name: true,
        imageUrl: true,
        stockQuantity: true,
        colorVariants: {
          select: {
            id: true,
            name: true,
            stockQuantity: true,
          },
        },
      },
    });

    const productBySku = new Map(products.map((p) => [p.sku, p]));

    // 4. Aggregate demand per product+variant
    const aggregateKey = (sku: string, variant: string | null) =>
      variant ? `${sku}::${variant}` : sku;

    const demandMap = new Map<
      string,
      {
        productId: string;
        productSku: string;
        productName: string;
        productImage: string | null;
        colorVariantId: string | null;
        colorVariantName: string | null;
        currentStock: number;
        totalOrdered: number;
        orders: {
          documentId: string;
          documentNumber: string;
          customerName: string;
          quantity: number;
          documentDate: string;
        }[];
      }
    >();

    for (const doc of documents) {
      const snapshot = doc.customerSnapshot as Record<string, unknown>;
      const customerName =
        (snapshot?.customerName as string) ||
        (snapshot?.companyName as string) ||
        "-";

      for (const item of doc.lineItems) {
        if (!item.productSku) continue;
        const product = productBySku.get(item.productSku);
        if (!product) continue;

        const key = aggregateKey(item.productSku, item.colorVariantName);

        if (!demandMap.has(key)) {
          // Determine current stock for this product/variant
          let currentStock = product.stockQuantity;
          let colorVariantId: string | null = null;
          if (item.colorVariantName) {
            const variant = product.colorVariants.find(
              (v) => v.name === item.colorVariantName
            );
            currentStock = variant?.stockQuantity ?? 0;
            colorVariantId = variant?.id ?? null;
          }

          demandMap.set(key, {
            productId: product.id,
            productSku: item.productSku,
            productName: item.productName,
            productImage: item.productImage || product.imageUrl,
            colorVariantId,
            colorVariantName: item.colorVariantName,
            currentStock,
            totalOrdered: 0,
            orders: [],
          });
        }

        const entry = demandMap.get(key)!;
        entry.totalOrdered += item.quantity;
        entry.orders.push({
          documentId: doc.id,
          documentNumber: doc.documentNumber,
          customerName,
          quantity: item.quantity,
          documentDate: doc.documentDate.toISOString(),
        });
      }
    }

    // 5. Compute shortages and stats
    const items = Array.from(demandMap.values()).map((item) => ({
      ...item,
      shortage: Math.max(0, item.totalOrdered - item.currentStock),
    }));

    // Sort: shortages first, then by product name
    items.sort((a, b) => {
      if (a.shortage > 0 && b.shortage === 0) return -1;
      if (a.shortage === 0 && b.shortage > 0) return 1;
      return a.productName.localeCompare(b.productName);
    });

    const stats = {
      totalProductsWithOrders: items.length,
      totalShortageItems: items.filter((i) => i.shortage > 0).length,
      totalShortageQuantity: items.reduce((sum, i) => sum + i.shortage, 0),
    };

    return { items: serialize(items), stats };
  } catch {
    return {
      items: [],
      stats: {
        totalProductsWithOrders: 0,
        totalShortageItems: 0,
        totalShortageQuantity: 0,
      },
    };
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
