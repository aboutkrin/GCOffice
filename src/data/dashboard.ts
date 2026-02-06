import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { getThaiNow } from "@/lib/thai-date";

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
  const thaiNow = getThaiNow();
  const startOfMonth = new Date(Date.UTC(thaiNow.year, thaiNow.month - 1, 1));
  const endOfMonth = new Date(Date.UTC(thaiNow.year, thaiNow.month, 0, 23, 59, 59, 999));

  const thisMonthFilter = {
    documentDate: {
      gte: startOfMonth,
      lte: endOfMonth,
    },
  };

  const excludeDraft = { status: { not: DocumentStatus.DRAFT } };
  const pendingStatuses = [DocumentStatus.QUOTED, DocumentStatus.BILLED];
  const confirmedStatuses = [DocumentStatus.CONFIRMED, DocumentStatus.PAID];

  // Helper to safely run a query, returning a fallback on failure
  // (e.g. if RECEIPT enum or newer statuses don't exist in DB yet)
  async function safeCount(where: Parameters<typeof prisma.document.count>[0]): Promise<number> {
    try {
      return await prisma.document.count(where);
    } catch {
      return 0;
    }
  }

  const [
    thisMonthQuotations,
    thisMonthInvoices,
    thisMonthPendingDocuments,
    thisMonthConfirmed,
    recentDocuments,
  ] = await Promise.all([
    safeCount({
      where: { type: DocumentType.QUOTATION, ...excludeDraft, ...thisMonthFilter },
    }),

    safeCount({
      where: { type: DocumentType.INVOICE, status: DocumentStatus.PAID, ...thisMonthFilter },
    }),

    safeCount({
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
    }).catch(() => null),

    prisma.document.findMany({
      where: { status: { not: DocumentStatus.DRAFT } },
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
    }).catch(() => [] as any[]),
  ]);

  return {
    thisMonthQuotations,
    thisMonthInvoices,
    thisMonthPendingDocuments,
    thisMonthConfirmedTotal: thisMonthConfirmed?._sum.grandTotal?.toNumber() ?? 0,
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

  const excludeDraft = { status: { not: DocumentStatus.DRAFT } };
  const pendingStatuses = [DocumentStatus.QUOTED, DocumentStatus.BILLED];
  const confirmedStatuses = [DocumentStatus.CONFIRMED, DocumentStatus.PAID];

  async function safeCount(where: Parameters<typeof prisma.document.count>[0]): Promise<number> {
    try {
      return await prisma.document.count(where);
    } catch {
      return 0;
    }
  }

  const [quotations, invoices, pendingDocuments, confirmed, yearsData] = await Promise.all([
    safeCount({
      where: { type: DocumentType.QUOTATION, ...excludeDraft, ...yearFilter },
    }),
    safeCount({
      where: { type: DocumentType.INVOICE, status: DocumentStatus.PAID, ...yearFilter },
    }),
    safeCount({
      where: { status: { in: pendingStatuses }, ...yearFilter },
    }),
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: { status: { in: confirmedStatuses }, ...yearFilter },
    }).catch(() => null),
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM document_date)::int AS year
      FROM documents
      ORDER BY year DESC
    `.catch(() => [] as { year: number }[]),
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
    confirmedTotal: confirmed?._sum.grandTotal?.toNumber() ?? 0,
    availableYears,
  };
}

// Monthly revenue, cost, and profit data

export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export interface MonthlyRevenueExpenseData {
  month: number;
  monthLabel: string;
  revenue: number;
  expense: number;
  profit: number;
}

export interface MonthlyRevenueExpenseResult {
  year: number;
  yearBE: number;
  totalRevenue: number;
  totalExpense: number;
  totalProfit: number;
  monthlyData: MonthlyRevenueExpenseData[];
  availableYears: number[];
}

export async function getMonthlyRevenueAndCost(year: number): Promise<MonthlyRevenueExpenseResult> {
  const confirmedStatuses = [DocumentStatus.CONFIRMED, DocumentStatus.PAID];

  async function fetchExpenseData() {
    try {
      return await prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT
          EXTRACT(MONTH FROM expense_date)::int AS month,
          COALESCE(SUM(amount), 0)::float8 AS total
        FROM expenses
        WHERE EXTRACT(YEAR FROM expense_date) = ${year}
        GROUP BY EXTRACT(MONTH FROM expense_date)
        ORDER BY month
      `;
    } catch {
      return [] as { month: number; total: number }[];
    }
  }

  async function fetchAvailableYears() {
    try {
      const docYears = await prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM document_date)::int AS year FROM documents
      `;
      let expYears: { year: number }[] = [];
      try {
        expYears = await prisma.$queryRaw<{ year: number }[]>`
          SELECT DISTINCT EXTRACT(YEAR FROM expense_date)::int AS year FROM expenses
        `;
      } catch {
        // expenses table may not exist
      }
      const allYears = [...new Set([...docYears.map(d => d.year), ...expYears.map(d => d.year)])];
      allYears.sort((a, b) => b - a);
      return allYears.map(y => ({ year: y }));
    } catch {
      return [] as { year: number }[];
    }
  }

  async function fetchRevenueData() {
    try {
      return await prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT
          EXTRACT(MONTH FROM document_date)::int AS month,
          COALESCE(SUM(grand_total), 0)::float8 AS total
        FROM documents
        WHERE status IN (${Prisma.join(confirmedStatuses)})
          AND EXTRACT(YEAR FROM document_date) = ${year}
        GROUP BY EXTRACT(MONTH FROM document_date)
        ORDER BY month
      `;
    } catch {
      return [] as { month: number; total: number }[];
    }
  }

  const [revenueData, expenseData, yearsData] = await Promise.all([
    fetchRevenueData(),
    fetchExpenseData(),
    fetchAvailableYears(),
  ]);

  // Build full 12-month array
  const monthlyData: MonthlyRevenueExpenseData[] = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const rev = revenueData.find((d) => d.month === monthNum);
    const exp = expenseData.find((d) => d.month === monthNum);
    const revenue = rev ? rev.total : 0;
    const expense = exp ? exp.total : 0;
    return {
      month: monthNum,
      monthLabel: THAI_MONTHS_SHORT[i],
      revenue,
      expense,
      profit: revenue - expense,
    };
  });

  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0);
  const availableYears = yearsData.map((d) => d.year);

  if (!availableYears.includes(year)) {
    availableYears.unshift(year);
    availableYears.sort((a, b) => b - a);
  }

  return {
    year,
    yearBE: year + 543,
    totalRevenue,
    totalExpense,
    totalProfit: totalRevenue - totalExpense,
    monthlyData,
    availableYears,
  };
}
