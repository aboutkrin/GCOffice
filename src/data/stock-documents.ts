import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { StockDocumentType, StockDocumentStatus, DocumentStatus, DocumentType } from "@/generated/prisma/client";

export async function getStockDocuments(params?: {
  type?: StockDocumentType | string;
  status?: StockDocumentStatus | string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  perPage?: number;
}) {
  const where: any = {};
  if (params?.type) where.type = params.type;
  if (params?.status) where.status = params.status;
  if (params?.search) {
    where.OR = [
      { documentNumber: { contains: params.search, mode: "insensitive" } },
      { reference: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.dateFrom || params?.dateTo) {
    where.documentDate = {};
    if (params.dateFrom) where.documentDate.gte = params.dateFrom;
    if (params.dateTo) where.documentDate.lte = params.dateTo;
  }

  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;

  try {
    const [data, total] = await Promise.all([
      prisma.stockDocument.findMany({
        where,
        include: {
          createdBy: { select: { id: true, fullName: true, username: true } },
          postedBy: { select: { id: true, fullName: true, username: true } },
          sourceDocument: { select: { id: true, documentNumber: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.stockDocument.count({ where }),
    ]);
    return { documents: serialize(data), total };
  } catch {
    return { documents: [], total: 0 };
  }
}

export async function getStockDocument(id: string) {
  try {
    const document = await prisma.stockDocument.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { sequence: "asc" },
          include: {
            product: { select: { id: true, sku: true, name: true, imageUrl: true, stockCode: true } },
            colorVariant: { select: { id: true, name: true, colorHex: true, stockCode: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true, username: true } },
        postedBy: { select: { id: true, fullName: true, username: true } },
        sourceDocument: {
          select: { id: true, documentNumber: true, customerSnapshot: true },
        },
        reversalOf: { select: { id: true, documentNumber: true } },
        reversedBy: { select: { id: true, documentNumber: true } },
      },
    });
    return serialize(document);
  } catch {
    return null;
  }
}

/** Resume the caller's own open DRAFT session for this type, if any. */
export async function getOpenStockDocumentFor(type: StockDocumentType, userId: string) {
  try {
    const document = await prisma.stockDocument.findFirst({
      where: { type, status: "DRAFT", createdById: userId },
      orderBy: { createdAt: "desc" },
      include: { lines: { orderBy: { sequence: "asc" } } },
    });
    return serialize(document);
  } catch {
    return null;
  }
}

/** CONFIRMED/SHIPPED quotations with at least one line not yet fully issued. */
export async function getIssuableDocuments(params?: { search?: string }) {
  try {
    const where: any = {
      type: DocumentType.QUOTATION,
      status: { in: [DocumentStatus.CONFIRMED, DocumentStatus.SHIPPED] },
    };
    if (params?.search) {
      where.OR = [
        { documentNumber: { contains: params.search, mode: "insensitive" } },
      ];
    }
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        documentNumber: true,
        documentDate: true,
        customerSnapshot: true,
        lineItems: { select: { id: true, quantity: true, productName: true } },
      },
      orderBy: { documentDate: "desc" },
      take: 50,
    });

    const lineItemIds = documents.flatMap((d) => d.lineItems.map((li) => li.id));
    const issuedByLineItem = await getIssuedQuantitiesByLineItem(lineItemIds);

    const result = documents
      .map((d) => {
        const lines = d.lineItems.map((li) => ({
          ...li,
          issued: issuedByLineItem.get(li.id) ?? 0,
          remaining: li.quantity - (issuedByLineItem.get(li.id) ?? 0),
        }));
        const remainingTotal = lines.reduce((sum, l) => sum + Math.max(0, l.remaining), 0);
        return { ...d, lines, remainingTotal };
      })
      .filter((d) => d.remainingTotal > 0);

    return serialize(result);
  } catch {
    return [];
  }
}

async function getIssuedQuantitiesByLineItem(lineItemIds: string[]): Promise<Map<string, number>> {
  if (lineItemIds.length === 0) return new Map();
  const rows = await prisma.stockDocumentLine.groupBy({
    by: ["sourceLineItemId"],
    where: {
      sourceLineItemId: { in: lineItemIds },
      stockDocument: { type: "ISSUE", status: "POSTED" },
    },
    _sum: { quantity: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.sourceLineItemId) map.set(row.sourceLineItemId, row._sum.quantity ?? 0);
  }
  return map;
}

/** Per line: ordered / issued / remaining, for the tick-off UI on a source document. */
export async function getDocumentIssueProgress(documentId: string) {
  try {
    const document = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      select: {
        lineItems: {
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            productId: true,
            colorVariantId: true,
            productSku: true,
            productName: true,
            colorVariantName: true,
            quantity: true,
          },
        },
      },
    });
    const lineItemIds = document.lineItems.map((li) => li.id);
    const issuedMap = await getIssuedQuantitiesByLineItem(lineItemIds);

    return serialize(
      document.lineItems.map((li) => ({
        ...li,
        issued: issuedMap.get(li.id) ?? 0,
        remaining: Math.max(0, li.quantity - (issuedMap.get(li.id) ?? 0)),
      }))
    );
  } catch {
    return [];
  }
}

/** Variance of a COUNT session's lines against live on-hand (computed at read time). */
export async function getStockCountVariance(stockDocumentId: string) {
  try {
    const stockDocument = await prisma.stockDocument.findUniqueOrThrow({
      where: { id: stockDocumentId },
      include: {
        lines: {
          orderBy: { sequence: "asc" },
          include: {
            product: { select: { id: true, stockQuantity: true } },
            colorVariant: { select: { id: true, stockQuantity: true } },
          },
        },
      },
    });

    return serialize(
      stockDocument.lines.map((line) => {
        const liveOnHand = line.colorVariant?.stockQuantity ?? line.product.stockQuantity;
        return {
          ...line,
          liveOnHand,
          variance: line.quantity - liveOnHand,
        };
      })
    );
  } catch {
    return [];
  }
}

export async function getLabelItems(params?: {
  categoryId?: string;
  search?: string;
  productIds?: string[];
  onlyInStock?: boolean;
}) {
  const where: any = { status: "ACTIVE" };
  if (params?.categoryId) where.categoryId = params.categoryId;
  if (params?.productIds && params.productIds.length > 0) {
    where.id = { in: params.productIds };
  }
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.onlyInStock) {
    where.stockQuantity = { gt: 0 };
  }

  try {
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        stockCode: true,
        name: true,
        colorVariants: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, colorHex: true, stockCode: true, sku: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return serialize(products);
  } catch {
    return [];
  }
}
