import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { getThaiNow } from "@/lib/thai-date";

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
}


export interface DashboardStats {
  // This month stats
  thisMonthQuotations: number;
  thisMonthInvoices: number;
  thisMonthPendingDocuments: number;
  thisMonthPendingCollection: number;
  thisMonthConfirmedTotal: number;
  thisMonthVatTotal: number;
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
    thisMonthConfirmedGrossTotal,
    thisMonthConfirmedVatTotal,
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

    // Sum grandTotal for CONFIRMED quotations
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        type: DocumentType.QUOTATION,
        status: DocumentStatus.CONFIRMED,
        ...thisMonthFilter,
      },
    }).catch(() => null),

    // Sum vatAmount for CONFIRMED quotations
    prisma.document.aggregate({
      _sum: { vatAmount: true },
      where: {
        type: DocumentType.QUOTATION,
        status: DocumentStatus.CONFIRMED,
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

  const totalVat = thisMonthConfirmedVatTotal?._sum.vatAmount?.toNumber() ?? 0;
  const grossTotal = thisMonthConfirmedGrossTotal?._sum.grandTotal?.toNumber() ?? 0;

  return {
    thisMonthQuotations,
    thisMonthInvoices,
    thisMonthPendingDocuments,
    thisMonthPendingCollection,
    thisMonthConfirmedTotal: grossTotal - totalVat,
    thisMonthVatTotal: totalVat,
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
  vatTotal: number;
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

  const [quotations, invoices, pendingDocuments, pendingCollection, confirmedGrossTotal, confirmedVatTotal, yearsData] = await Promise.all([
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
    // Sum grandTotal for CONFIRMED quotations
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        type: DocumentType.QUOTATION,
        status: DocumentStatus.CONFIRMED,
        ...yearFilter,
      },
    }).catch(() => null),
    // Sum vatAmount for CONFIRMED quotations
    prisma.document.aggregate({
      _sum: { vatAmount: true },
      where: {
        type: DocumentType.QUOTATION,
        status: DocumentStatus.CONFIRMED,
        ...yearFilter,
      },
    }).catch(() => null),
    prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM document_date)::int AS year
      FROM documents
      ORDER BY year DESC
    `.catch(() => [] as { year: number }[]),
  ]);

  const totalVat = confirmedVatTotal?._sum.vatAmount?.toNumber() ?? 0;
  const grossTotal = confirmedGrossTotal?._sum.grandTotal?.toNumber() ?? 0;

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
    confirmedTotal: grossTotal - totalVat,
    vatTotal: totalVat,
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
  vat: number;
  expense: number;
  profit: number;
}

export interface MonthlyRevenueExpenseResult {
  year: number;
  yearBE: number;
  totalRevenue: number;
  totalVat: number;
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

  // VAT from INVOICE documents:
  // - PAID: full vatAmount
  // - DEPOSITED: proportional VAT for first payment term
  async function fetchInvoiceVatData() {
    try {
      return await prisma.$queryRaw<{ month: number; total: number }[]>`
        SELECT month, COALESCE(SUM(total), 0)::float8 AS total
        FROM (
          SELECT
            EXTRACT(MONTH FROM document_date)::int AS month,
            vat_amount AS total
          FROM documents
          WHERE type = 'INVOICE'
            AND status = 'PAID'
            AND EXTRACT(YEAR FROM document_date) = ${year}
          UNION ALL
          SELECT
            EXTRACT(MONTH FROM d.document_date)::int AS month,
            dpt.calculated_amount * d.vat_amount / NULLIF(d.grand_total, 0) AS total
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

  const [revenueData, vatData, expenseData, yearsData] = await Promise.all([
    fetchInvoiceRevenueData(),
    fetchInvoiceVatData(),
    fetchExpenseData(),
    fetchAvailableYears(),
  ]);

  // Build full 12-month array
  // Revenue = gross revenue minus VAT
  // Expense = monthly operating expenses + vendor costs (purchase order costs)
  const monthlyData: MonthlyRevenueExpenseData[] = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const rev = revenueData.find((d) => d.month === monthNum);
    const vat = vatData.find((d) => d.month === monthNum);
    const exp = expenseData.find((d) => d.month === monthNum);
    const grossRevenue = rev?.total ?? 0;
    const vatAmount = vat?.total ?? 0;
    const revenue = grossRevenue - vatAmount;
    const expense = exp?.total ?? 0;
    return {
      month: monthNum,
      monthLabel: THAI_MONTHS_SHORT[i],
      revenue,
      vat: vatAmount,
      expense,
      profit: revenue - expense,
    };
  });

  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalVat = monthlyData.reduce((sum, m) => sum + m.vat, 0);
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
    totalVat,
    totalExpense,
    totalProfit: totalRevenue - totalExpense,
    monthlyData,
    availableYears,
  };
}

// Delivery schedule for confirmed quotations

export interface DeliveryScheduleItem {
  id: string;
  documentNumber: string;
  customerName: string;
  status: string;
  deliveryDateStart: string;
  deliveryDateEnd: string | null;
  grandTotal: number;
  productionDays: string | null;
  lineItems: {
    productName: string;
    quantity: number;
    productImage: string | null;
  }[];
}

export async function getDeliverySchedule(
  year: number,
  month: number
): Promise<DeliveryScheduleItem[]> {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  try {
    const documents = await prisma.document.findMany({
      where: {
        type: DocumentType.QUOTATION,
        status: { in: [DocumentStatus.CONFIRMED, DocumentStatus.SHIPPED] },
        deliveryDateStart: { not: null },
        OR: [
          {
            deliveryDateStart: { gte: startOfMonth, lte: endOfMonth },
          },
          {
            deliveryDateEnd: { gte: startOfMonth, lte: endOfMonth },
          },
          {
            deliveryDateStart: { lte: startOfMonth },
            deliveryDateEnd: { gte: endOfMonth },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        documentNumber: true,
        customerSnapshot: true,
        deliveryDateStart: true,
        deliveryDateEnd: true,
        grandTotal: true,
        productionDays: true,
        lineItems: {
          select: {
            productName: true,
            quantity: true,
            productImage: true,
          },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { deliveryDateStart: "asc" },
    });

    return documents.map((doc) => {
      const snapshot = doc.customerSnapshot as Record<string, unknown>;
      const baseName =
        (snapshot?.customerName as string) ||
        (snapshot?.companyName as string) ||
        "-";
      const leadName = snapshot?.leadName as string | undefined;
      const customerName = leadName
        ? `${baseName} (${leadName})`
        : baseName;
      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        customerName,
        status: doc.status,
        deliveryDateStart: doc.deliveryDateStart!.toISOString(),
        deliveryDateEnd: doc.deliveryDateEnd?.toISOString() ?? null,
        grandTotal: Number(doc.grandTotal),
        productionDays: doc.productionDays,
        lineItems: doc.lineItems.map((li) => ({
          productName: li.productName,
          quantity: Number(li.quantity),
          productImage: li.productImage,
        })),
      };
    });
  } catch {
    return [];
  }
}

export async function getHolidaysForMonth(
  year: number,
  month: number
): Promise<HolidayItem[]> {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  try {
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
        name: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    return holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString(),
    }));
  } catch {
    return [];
  }
}
