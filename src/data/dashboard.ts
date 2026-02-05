import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export interface DashboardStats {
  // This month stats
  thisMonthQuotations: number;
  thisMonthInvoices: number;
  thisMonthPendingDocuments: number;
  thisMonthConfirmedTotal: number;
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

  const nonDraftStatuses = [
    DocumentStatus.QUOTED,
    DocumentStatus.CONFIRMED,
    DocumentStatus.SAMPLE,
    DocumentStatus.BILLED,
    DocumentStatus.PAID,
    DocumentStatus.CANCELLED,
  ];
  const pendingStatuses = [DocumentStatus.QUOTED, DocumentStatus.BILLED];
  const confirmedStatuses = [DocumentStatus.CONFIRMED, DocumentStatus.PAID];

  const [
    thisMonthQuotations,
    thisMonthInvoices,
    thisMonthPendingDocuments,
    thisMonthConfirmed,
    recentDocuments,
  ] = await Promise.all([
    prisma.document.count({
      where: { type: DocumentType.QUOTATION, status: { in: nonDraftStatuses }, ...thisMonthFilter },
    }),

    prisma.document.count({
      where: { type: DocumentType.INVOICE, status: { in: nonDraftStatuses }, ...thisMonthFilter },
    }),

    prisma.document.count({
      where: {
        status: { in: pendingStatuses },
        ...thisMonthFilter,
      },
    }),

    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        status: { in: confirmedStatuses },
        ...thisMonthFilter,
      },
    }),

    prisma.document.findMany({
      where: { status: { in: nonDraftStatuses } },
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
    thisMonthQuotations,
    thisMonthInvoices,
    thisMonthPendingDocuments,
    thisMonthConfirmedTotal: thisMonthConfirmed._sum.grandTotal?.toNumber() ?? 0,
    recentDocuments: serialize(recentDocuments) as RecentDocument[],
  };
}

// Yearly stats

export interface YearlyStats {
  year: number;
  yearBE: number;
  quotations: number;
  invoices: number;
  pendingDocuments: number;
  confirmedTotal: number;
  availableYears: number[];
}

export async function getYearlyStats(year: number): Promise<YearlyStats> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

  const yearFilter = {
    documentDate: {
      gte: startOfYear,
      lte: endOfYear,
    },
  };

  const nonDraftStatuses = [
    DocumentStatus.QUOTED,
    DocumentStatus.CONFIRMED,
    DocumentStatus.SAMPLE,
    DocumentStatus.BILLED,
    DocumentStatus.PAID,
    DocumentStatus.CANCELLED,
  ];
  const pendingStatuses = [DocumentStatus.QUOTED, DocumentStatus.BILLED];
  const confirmedStatuses = [DocumentStatus.CONFIRMED, DocumentStatus.PAID];

  const [quotations, invoices, pendingDocuments, confirmed, yearsData] = await Promise.all([
    prisma.document.count({
      where: { type: DocumentType.QUOTATION, status: { in: nonDraftStatuses }, ...yearFilter },
    }),
    prisma.document.count({
      where: { type: DocumentType.INVOICE, status: { in: nonDraftStatuses }, ...yearFilter },
    }),
    prisma.document.count({
      where: { status: { in: pendingStatuses }, ...yearFilter },
    }),
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: { status: { in: confirmedStatuses }, ...yearFilter },
    }),
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM document_date)::int AS year
      FROM documents
      ORDER BY year DESC
    `,
  ]);

  const availableYears = yearsData.map((d) => d.year);
  if (!availableYears.includes(year)) {
    availableYears.unshift(year);
    availableYears.sort((a, b) => b - a);
  }

  return {
    year,
    yearBE: year + 543,
    quotations,
    invoices,
    pendingDocuments,
    confirmedTotal: confirmed._sum.grandTotal?.toNumber() ?? 0,
    availableYears,
  };
}

// Monthly sales chart data

export interface MonthlySalesData {
  month: number;
  monthLabel: string;
  total: number;
}

export interface MonthlySalesResult {
  year: number;
  yearBE: number;
  grandTotal: number;
  monthlySales: MonthlySalesData[];
  availableYears: number[];
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export async function getMonthlySales(year: number): Promise<MonthlySalesResult> {
  const confirmedStatuses = [DocumentStatus.CONFIRMED, DocumentStatus.PAID];

  const [monthlyData, yearsData] = await Promise.all([
    // Monthly totals for the given year
    prisma.$queryRaw<{ month: number; total: number }[]>`
      SELECT
        EXTRACT(MONTH FROM document_date)::int AS month,
        COALESCE(SUM(grand_total), 0)::float8 AS total
      FROM documents
      WHERE status IN (${Prisma.join(confirmedStatuses)})
        AND EXTRACT(YEAR FROM document_date) = ${year}
      GROUP BY EXTRACT(MONTH FROM document_date)
      ORDER BY month
    `,
    // Available years that have documents
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM document_date)::int AS year
      FROM documents
      ORDER BY year DESC
    `,
  ]);

  // Build full 12-month array
  const monthlySales: MonthlySalesData[] = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const found = monthlyData.find((d) => d.month === monthNum);
    return {
      month: monthNum,
      monthLabel: THAI_MONTHS_SHORT[i],
      total: found ? found.total : 0,
    };
  });

  const grandTotal = monthlySales.reduce((sum, m) => sum + m.total, 0);
  const availableYears = yearsData.map((d) => d.year);

  // Ensure current year is always available
  if (!availableYears.includes(year)) {
    availableYears.unshift(year);
    availableYears.sort((a, b) => b - a);
  }

  return {
    year,
    yearBE: year + 543,
    grandTotal,
    monthlySales,
    availableYears,
  };
}
