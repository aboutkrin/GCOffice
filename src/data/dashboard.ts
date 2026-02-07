import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { getThaiNow } from "@/lib/thai-date";


export interface DashboardStats {
  // This month stats
  thisMonthQuotations: number;
  thisMonthInvoices: number;
  thisMonthPendingDocuments: number;
  thisMonthPendingCollection: number;
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
  const revenueStatuses = [DocumentStatus.PAID, DocumentStatus.DEPOSITED];

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
    thisMonthPendingCollection,
    thisMonthPaidTotal,
    thisMonthDepositedTotal,
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

    safeCount({
      where: {
        type: DocumentType.INVOICE,
        status: DocumentStatus.DEPOSITED,
        ...thisMonthFilter,
      },
    }),

    // Sum grandTotal for PAID invoices
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        type: DocumentType.INVOICE,
        status: DocumentStatus.PAID,
        ...thisMonthFilter,
      },
    }).catch(() => null),

    // Sum first payment term (sequence=1) calculatedAmount for DEPOSITED invoices
    prisma.documentPaymentTerm.aggregate({
      _sum: { calculatedAmount: true },
      where: {
        sequence: 1,
        document: {
          type: DocumentType.INVOICE,
          status: DocumentStatus.DEPOSITED,
          ...thisMonthFilter,
        },
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
    thisMonthPendingCollection,
    thisMonthConfirmedTotal:
      (thisMonthPaidTotal?._sum.grandTotal?.toNumber() ?? 0) +
      (thisMonthDepositedTotal?._sum.calculatedAmount?.toNumber() ?? 0),
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
  pendingCollection: number;
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
  const revenueStatuses = [DocumentStatus.PAID, DocumentStatus.DEPOSITED];

  async function safeCount(where: Parameters<typeof prisma.document.count>[0]): Promise<number> {
    try {
      return await prisma.document.count(where);
    } catch {
      return 0;
    }
  }

  const [quotations, invoices, pendingDocuments, pendingCollection, paidTotal, depositedTotal, yearsData] = await Promise.all([
    safeCount({
      where: { type: DocumentType.QUOTATION, ...excludeDraft, ...yearFilter },
    }),
    safeCount({
      where: { type: DocumentType.INVOICE, status: DocumentStatus.PAID, ...yearFilter },
    }),
    safeCount({
      where: { status: { in: pendingStatuses }, ...yearFilter },
    }),
    safeCount({
      where: {
        type: DocumentType.INVOICE,
        status: DocumentStatus.DEPOSITED,
        ...yearFilter,
      },
    }),
    // Sum grandTotal for PAID invoices
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        type: DocumentType.INVOICE,
        status: DocumentStatus.PAID,
        ...yearFilter,
      },
    }).catch(() => null),
    // Sum first payment term (sequence=1) calculatedAmount for DEPOSITED invoices
    prisma.documentPaymentTerm.aggregate({
      _sum: { calculatedAmount: true },
      where: {
        sequence: 1,
        document: {
          type: DocumentType.INVOICE,
          status: DocumentStatus.DEPOSITED,
          ...yearFilter,
        },
      },
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
    pendingCollection,
    confirmedTotal:
      (paidTotal?._sum.grandTotal?.toNumber() ?? 0) +
      (depositedTotal?._sum.calculatedAmount?.toNumber() ?? 0),
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
  async function fetchExpenseData() {
    try {
      return await prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT month, COALESCE(SUM(total), 0)::float8 AS total
        FROM (
          SELECT
            EXTRACT(MONTH FROM expense_date)::int AS month,
            amount AS total
          FROM expenses
          WHERE EXTRACT(YEAR FROM expense_date) = ${year}
          UNION ALL
          SELECT
            EXTRACT(MONTH FROM order_date)::int AS month,
            total_cost AS total
          FROM vendor_costs
          WHERE EXTRACT(YEAR FROM order_date) = ${year}
        ) combined
        GROUP BY month
        ORDER BY month
      `;
    } catch {
      return [] as { month: number; total: number }[];
    }
  }

  async function fetchVendorCostData() {
    try {
      return await prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT
          EXTRACT(MONTH FROM order_date)::int AS month,
          COALESCE(SUM(total_cost), 0)::float8 AS total
        FROM vendor_costs
        WHERE EXTRACT(YEAR FROM order_date) = ${year}
        GROUP BY EXTRACT(MONTH FROM order_date)
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
      let vcYears: { year: number }[] = [];
      try {
        vcYears = await prisma.$queryRaw<{ year: number }[]>`
          SELECT DISTINCT EXTRACT(YEAR FROM order_date)::int AS year FROM vendor_costs
        `;
      } catch {
        // vendor_costs table may not exist
      }
      const allYears = [...new Set([
        ...docYears.map(d => d.year),
        ...expYears.map(d => d.year),
        ...vcYears.map(d => d.year),
      ])];
      allYears.sort((a, b) => b - a);
      return allYears.map(y => ({ year: y }));
    } catch {
      return [] as { year: number }[];
    }
  }

  // Revenue from INVOICE documents:
  // - PAID: full grandTotal
  // - DEPOSITED: only first payment term (sequence=1) calculatedAmount
  async function fetchInvoiceRevenueData() {
    try {
      return await prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT month, COALESCE(SUM(total), 0)::float8 AS total
        FROM (
          SELECT
            EXTRACT(MONTH FROM document_date)::int AS month,
            grand_total AS total
          FROM documents
          WHERE type = 'INVOICE'
            AND status = 'PAID'
            AND EXTRACT(YEAR FROM document_date) = ${year}
          UNION ALL
          SELECT
            EXTRACT(MONTH FROM d.document_date)::int AS month,
            dpt.calculated_amount AS total
          FROM documents d
          INNER JOIN document_payment_terms dpt ON dpt.document_id = d.id AND dpt.sequence = 1
          WHERE d.type = 'INVOICE'
            AND d.status = 'DEPOSITED'
            AND EXTRACT(YEAR FROM d.document_date) = ${year}
        ) sub
        GROUP BY month
        ORDER BY month
      `;
    } catch {
      return [] as { month: number; total: number }[];
    }
  }

  const [revenueData, expenseData, vendorCostData, yearsData] = await Promise.all([
    fetchInvoiceRevenueData(),
    fetchExpenseData(),
    fetchVendorCostData(),
    fetchAvailableYears(),
  ]);

  // Build full 12-month array
  // Expense = monthly operating expenses + vendor costs (purchase order costs)
  const monthlyData: MonthlyRevenueExpenseData[] = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const rev = revenueData.find((d) => d.month === monthNum);
    const exp = expenseData.find((d) => d.month === monthNum);
    const vc = vendorCostData.find((d) => d.month === monthNum);
    const revenue = rev?.total ?? 0;
    const expense = (exp?.total ?? 0) + (vc?.total ?? 0);
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
