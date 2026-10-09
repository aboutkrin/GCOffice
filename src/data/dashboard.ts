import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { getThaiNow } from "@/lib/thai-date";
import { getFinanceYear } from "@/data/finance";
import { round2 } from "@/lib/finance";

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
  /** COMPANY = office closed, PUBLIC = general holiday the office still works,
   *  CHINA = Chinese holiday (office works, China doesn't ship) */
  type: "COMPANY" | "PUBLIC" | "CHINA";
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

    // Sum grandTotal for CONFIRMED/SHIPPED/BILLED quotations
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        type: DocumentType.QUOTATION,
        status: { in: [DocumentStatus.CONFIRMED, DocumentStatus.SHIPPED, DocumentStatus.BILLED] },
        ...thisMonthFilter,
      },
    }).catch(() => null),

    // Sum vatAmount for CONFIRMED/SHIPPED/BILLED quotations
    prisma.document.aggregate({
      _sum: { vatAmount: true },
      where: {
        type: DocumentType.QUOTATION,
        status: { in: [DocumentStatus.CONFIRMED, DocumentStatus.SHIPPED, DocumentStatus.BILLED] },
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
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

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
    // Sum grandTotal for CONFIRMED/SHIPPED/BILLED quotations
    prisma.document.aggregate({
      _sum: { grandTotal: true },
      where: {
        type: DocumentType.QUOTATION,
        status: { in: [DocumentStatus.CONFIRMED, DocumentStatus.SHIPPED, DocumentStatus.BILLED] },
        ...yearFilter,
      },
    }).catch(() => null),
    // Sum vatAmount for CONFIRMED/SHIPPED/BILLED quotations
    prisma.document.aggregate({
      _sum: { vatAmount: true },
      where: {
        type: DocumentType.QUOTATION,
        status: { in: [DocumentStatus.CONFIRMED, DocumentStatus.SHIPPED, DocumentStatus.BILLED] },
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
  /** grandTotal − VAT of the sold quotations */
  revenue: number;
  vat: number;
  cogs: number;
  deliveryCost: number;
  legacyVendorCost: number;
  /** cogs + deliveryCost + legacyVendorCost */
  productCost: number;
  /** /expenses rows (payroll included) */
  operatingExpense: number;
  /** productCost + operatingExpense */
  expense: number;
  grossProfit: number;
  /** Net profit */
  profit: number;
  marginPercent: number;
}

export interface MonthlyRevenueExpenseResult {
  year: number;
  yearBE: number;
  totalRevenue: number;
  totalVat: number;
  totalProductCost: number;
  totalOperatingExpense: number;
  totalExpense: number;
  totalProfit: number;
  monthlyData: MonthlyRevenueExpenseData[];
  availableYears: number[];
}

/**
 * Revenue, product cost, operating expenses and profit per month of a year.
 * Same numbers as the month page (/dashboard/finance/[year]/[month]); both
 * come from src/data/finance.ts.
 */
export async function getMonthlyRevenueAndCost(year: number): Promise<MonthlyRevenueExpenseResult> {
  async function fetchAvailableYears() {
    const years = async (q: Promise<{ year: number }[]>) => q.catch(() => [] as { year: number }[]);
    const [docYears, expYears, vcYears] = await Promise.all([
      years(prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM document_date)::int AS year FROM documents
      `),
      years(prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM expense_date)::int AS year FROM expenses
      `),
      years(prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM order_date)::int AS year FROM vendor_costs
      `),
    ]);
    const all = [...new Set([...docYears, ...expYears, ...vcYears].map((d) => d.year))];
    return all.sort((a, b) => b - a);
  }

  const [months, availableYears] = await Promise.all([getFinanceYear(year), fetchAvailableYears()]);

  const monthlyData: MonthlyRevenueExpenseData[] = months.map((m, i) => ({
    month: i + 1,
    monthLabel: THAI_MONTHS_SHORT[i],
    revenue: m.revenue,
    vat: m.vat,
    cogs: m.cogs,
    deliveryCost: m.deliveryCost,
    legacyVendorCost: m.legacyVendorCost,
    productCost: m.productCost,
    operatingExpense: m.operatingExpense,
    expense: round2(m.productCost + m.operatingExpense),
    grossProfit: m.grossProfit,
    profit: m.netProfit,
    marginPercent: m.marginPercent,
  }));

  const total = (key: keyof MonthlyRevenueExpenseData) =>
    round2(monthlyData.reduce((sum, m) => sum + (m[key] as number), 0));

  if (!availableYears.includes(year)) {
    availableYears.unshift(year);
    availableYears.sort((a, b) => b - a);
  }

  return {
    year,
    yearBE: year + 543,
    totalRevenue: total("revenue"),
    totalVat: total("vat"),
    totalProductCost: total("productCost"),
    totalOperatingExpense: total("operatingExpense"),
    totalExpense: total("expense"),
    totalProfit: total("profit"),
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
        documentNumber: doc.documentNumber ?? "ร่าง",
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
        type: true,
      },
      orderBy: [{ date: "asc" }, { type: "asc" }],
    });

    return holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString(),
      type: h.type,
    }));
  } catch {
    return [];
  }
}
