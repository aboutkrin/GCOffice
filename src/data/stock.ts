import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { DocumentStatus, DocumentType, Prisma } from "@/generated/prisma/client";
import {
  availabilityKey,
  getAvailabilityForProducts,
  getReservationMap,
} from "./stock-availability";

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
    // Prisma 7 supports column-to-column comparison via field references.
    where.stockQuantity = {
      gt: 0,
      lte: prisma.product.fields.lowStockThreshold,
    };
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
              sku: true,
            },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.product.count({ where }),
    ]);

    const reservationMap = await getReservationMap(data.map((p) => p.id));
    const products = data.map((p) => {
      // Sum reservations across the bare product key and every colour variant —
      // the product row's total is what a salesperson sees before drilling into colours.
      const keys = [availabilityKey(p.id, null), ...p.colorVariants.map((v) => availabilityKey(p.id, v.id))];
      const reserved = keys.reduce((sum, k) => sum + (reservationMap.get(k) ?? 0), 0);
      const colorVariants = p.colorVariants.map((v) => {
        const vReserved = reservationMap.get(availabilityKey(p.id, v.id)) ?? 0;
        return { ...v, reserved: vReserved, available: v.stockQuantity - vReserved };
      });
      return {
        ...p,
        colorVariants,
        reserved,
        available: p.stockQuantity - reserved,
      };
    });

    return { products: serialize(products), total };
  } catch {
    return { products: [], total: 0 };
  }
}

export async function getStockStats() {
  try {
    const [totalProducts, outOfStock, lowStock, reorderResult] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.product.count({ where: { status: "ACTIVE", stockQuantity: 0 } }),
      prisma.product.count({
        where: {
          status: "ACTIVE",
          stockQuantity: { gt: 0, lte: prisma.product.fields.lowStockThreshold },
        },
      }),
      prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM(GREATEST(0, low_stock_threshold - stock_quantity)), 0)::int AS total
        FROM products WHERE status = 'ACTIVE'
      `),
    ]);

    const totalReorderQuantity = reorderResult[0]?.total ?? 0;
    const inStock = totalProducts - outOfStock - lowStock;

    const reservationMap = await getReservationMap();
    let totalReserved = 0;
    for (const reserved of reservationMap.values()) totalReserved += reserved;

    return { totalProducts, inStock, lowStock, outOfStock, totalReorderQuantity, totalReserved };
  } catch {
    return { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalReorderQuantity: 0, totalReserved: 0 };
  }
}

export async function getStockMovements(params?: {
  productId?: string;
  colorVariantId?: string;
  type?: string;
  stockDocumentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  perPage?: number;
}) {
  const where: any = {};
  if (params?.productId) where.productId = params.productId;
  if (params?.colorVariantId) where.colorVariantId = params.colorVariantId;
  if (params?.type) where.type = params.type;
  if (params?.stockDocumentId) where.stockDocumentId = params.stockDocumentId;
  if (params?.dateFrom || params?.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) where.createdAt.gte = params.dateFrom;
    if (params.dateTo) where.createdAt.lte = params.dateTo;
  }

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
          createdBy: {
            select: { id: true, fullName: true, username: true },
          },
          stockDocument: {
            select: { id: true, documentNumber: true, type: true },
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
            sku: true,
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
    // 1. Fetch all confirmed/shipped quotations that opted into reservation
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
            productId: true,
            colorVariantId: true,
            productSku: true,
            productName: true,
            productImage: true,
            colorVariantName: true,
            quantity: true,
          },
        },
      },
    });

    // 2. Collect all unique product ids referenced (matched ones only)
    const productIds = new Set<string>();
    for (const doc of documents) {
      for (const item of doc.lineItems) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    // 3. Fetch current stock + reservation for these products
    const [products, reservationMap] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: Array.from(productIds) } },
        select: {
          id: true,
          sku: true,
          name: true,
          imageUrl: true,
          stockQuantity: true,
          colorVariants: {
            select: { id: true, name: true, sku: true, stockQuantity: true },
          },
        },
      }),
      getReservationMap(Array.from(productIds)),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));

    // 4. Aggregate demand per product+variant, keyed by stable ids
    const demandMap = new Map<
      string,
      {
        productId: string;
        productSku: string;
        productName: string;
        productImage: string | null;
        colorVariantId: string | null;
        colorVariantName: string | null;
        colorVariantSku: string | null;
        currentStock: number;
        reserved: number;
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
    const unmatchedLines: { productSku: string | null; productName: string }[] = [];

    for (const doc of documents) {
      const snapshot = doc.customerSnapshot as Record<string, unknown>;
      const customerName =
        (snapshot?.customerName as string) ||
        (snapshot?.companyName as string) ||
        "-";

      for (const item of doc.lineItems) {
        if (!item.productId) {
          if (item.productSku) {
            unmatchedLines.push({ productSku: item.productSku, productName: item.productName });
          }
          continue;
        }
        const product = productById.get(item.productId);
        if (!product) continue;

        const key = availabilityKey(item.productId, item.colorVariantId);

        if (!demandMap.has(key)) {
          let currentStock = product.stockQuantity;
          let colorVariantSku: string | null = null;
          if (item.colorVariantId) {
            const variant = product.colorVariants.find((v) => v.id === item.colorVariantId);
            currentStock = variant?.stockQuantity ?? 0;
            colorVariantSku = variant?.sku ?? null;
          }

          demandMap.set(key, {
            productId: item.productId,
            productSku: item.productSku ?? product.sku,
            productName: item.productName,
            productImage: item.productImage || product.imageUrl,
            colorVariantId: item.colorVariantId,
            colorVariantName: item.colorVariantName,
            colorVariantSku,
            currentStock,
            reserved: reservationMap.get(key) ?? 0,
            totalOrdered: 0,
            orders: [],
          });
        }

        const entry = demandMap.get(key)!;
        entry.totalOrdered += item.quantity;
        entry.orders.push({
          documentId: doc.id,
          documentNumber: doc.documentNumber ?? "ร่าง",
          customerName,
          quantity: item.quantity,
          documentDate: doc.documentDate.toISOString(),
        });
      }
    }

    // 5. Compute shortages (against on-hand) and stats
    const items = Array.from(demandMap.values()).map((item) => ({
      ...item,
      issued: item.totalOrdered - item.reserved,
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

    return { items: serialize(items), stats, unmatchedLines: serialize(unmatchedLines) };
  } catch {
    return {
      items: [],
      stats: {
        totalProductsWithOrders: 0,
        totalShortageItems: 0,
        totalShortageQuantity: 0,
      },
      unmatchedLines: [],
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
    if (!product) return null;

    const availability = await getAvailabilityForProducts([productId]);
    const colorVariants = product.colorVariants.map((v) => {
      const a = availability.get(availabilityKey(productId, v.id));
      return { ...v, reserved: a?.reserved ?? 0, available: (a?.onHand ?? v.stockQuantity) - (a?.reserved ?? 0) };
    });
    // Total reserved for the product = the bare key plus every colour variant's reservation.
    const productReserved =
      (availability.get(availabilityKey(productId, null))?.reserved ?? 0) +
      colorVariants.reduce((sum, v) => sum + v.reserved, 0);

    return serialize({
      ...product,
      reserved: productReserved,
      available: product.stockQuantity - productReserved,
      colorVariants,
    });
  } catch {
    return null;
  }
}
