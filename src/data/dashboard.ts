import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export interface DashboardStats {
  totalQuotations: number;
  totalInvoices: number;
  pendingDocuments: number;
  thisMonthConfirmedTotal: number;
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

  const [
    totalQuotations,
    totalInvoices,
    pendingDocuments,
    thisMonthConfirmed,
    recentDocuments,
  ] = await Promise.all([
    prisma.document.count({
      where: { type: DocumentType.QUOTATION },
    }),

    prisma.document.count({
      where: { type: DocumentType.INVOICE },
    }),

    prisma.document.count({
      where: {
        status: {
          in: [DocumentStatus.DRAFT, DocumentStatus.QUOTED, DocumentStatus.BILLED],
        },
      },
    }),

    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        status: {
          in: [DocumentStatus.CONFIRMED, DocumentStatus.PAID],
        },
        documentDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),

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
    totalQuotations,
    totalInvoices,
    pendingDocuments,
    thisMonthConfirmedTotal: thisMonthConfirmed._sum.grandTotal?.toNumber() ?? 0,
    recentDocuments: serialize(recentDocuments) as RecentDocument[],
  };
}
