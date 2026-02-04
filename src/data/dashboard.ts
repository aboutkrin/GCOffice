import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export interface DashboardStats {
  // This month stats
  thisMonthQuotations: number;
  thisMonthInvoices: number;
  thisMonthPendingDocuments: number;
  thisMonthConfirmedTotal: number;
  // All time stats
  totalQuotations: number;
  totalInvoices: number;
  totalPendingDocuments: number;
  totalConfirmedTotal: number;
  // Recent documents
  recentDocuments: RecentDocument[];
}

export interface RecentDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  documentNumber: string;
  documentDate: Date;
  grandTotal: any;
  customerSnapshot: Record<string, unknown>;
  createdAt: Date;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const thisMonthFilter = {
    documentDate: {
      gte: startOfMonth,
      lte: endOfMonth,
    },
  };

  const pendingStatuses = [DocumentStatus.DRAFT, DocumentStatus.QUOTED, DocumentStatus.BILLED];
  const confirmedStatuses = [DocumentStatus.CONFIRMED, DocumentStatus.PAID];

  const [
    // This month stats
    thisMonthQuotations,
    thisMonthInvoices,
    thisMonthPendingDocuments,
    thisMonthConfirmed,
    // All time stats
    totalQuotations,
    totalInvoices,
    totalPendingDocuments,
    totalConfirmed,
    // Recent documents
    recentDocuments,
  ] = await Promise.all([
    // This month quotations
    prisma.document.count({
      where: { type: DocumentType.QUOTATION, ...thisMonthFilter },
    }),

    // This month invoices
    prisma.document.count({
      where: { type: DocumentType.INVOICE, ...thisMonthFilter },
    }),

    // This month pending documents
    prisma.document.count({
      where: {
        status: { in: pendingStatuses },
        ...thisMonthFilter,
      },
    }),

    // This month confirmed total
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        status: { in: confirmedStatuses },
        ...thisMonthFilter,
      },
    }),

    // Total quotations
    prisma.document.count({
      where: { type: DocumentType.QUOTATION },
    }),

    // Total invoices
    prisma.document.count({
      where: { type: DocumentType.INVOICE },
    }),

    // Total pending documents
    prisma.document.count({
      where: {
        status: { in: pendingStatuses },
      },
    }),

    // Total confirmed
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        status: { in: confirmedStatuses },
      },
    }),

    // Recent documents
    prisma.document.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        documentNumber: true,
        documentDate: true,
        grandTotal: true,
        customerSnapshot: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    // This month stats
    thisMonthQuotations,
    thisMonthInvoices,
    thisMonthPendingDocuments,
    thisMonthConfirmedTotal: thisMonthConfirmed._sum.grandTotal?.toNumber() ?? 0,
    // All time stats
    totalQuotations,
    totalInvoices,
    totalPendingDocuments,
    totalConfirmedTotal: totalConfirmed._sum.grandTotal?.toNumber() ?? 0,
    // Recent documents
    recentDocuments: serialize(recentDocuments) as RecentDocument[],
  };
}
