import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export async function getDocuments(params?: {
  type?: DocumentType;
  status?: DocumentStatus | DocumentStatus[];
  excludeStatus?: DocumentStatus | DocumentStatus[];
  search?: string;
  year?: number;
  month?: number;
}) {
  const where: any = {};
  if (params?.type) where.type = params.type;
  if (params?.status) {
    if (Array.isArray(params.status)) {
      where.status = { in: params.status };
    } else {
      where.status = params.status;
    }
  } else if (params?.excludeStatus) {
    if (Array.isArray(params.excludeStatus)) {
      where.status = { notIn: params.excludeStatus };
    } else {
      where.status = { not: params.excludeStatus };
    }
  }
  if (params?.search) {
    where.OR = [
      { documentNumber: { contains: params.search, mode: "insensitive" } },
      { customInvoiceNumber: { contains: params.search, mode: "insensitive" } },
      {
        customerSnapshot: {
          path: ["customerName"],
          string_contains: params.search,
        },
      },
    ];
  }
  if (params?.year && params?.month) {
    const startDate = new Date(Date.UTC(params.year, params.month - 1, 1));
    const endDate = new Date(Date.UTC(params.year, params.month, 1));
    where.documentDate = {
      gte: startDate,
      lt: endDate,
    };
  } else if (params?.year) {
    const startDate = new Date(Date.UTC(params.year, 0, 1));
    const endDate = new Date(Date.UTC(params.year + 1, 0, 1));
    where.documentDate = {
      gte: startDate,
      lt: endDate,
    };
  }

  try {
    const data = await prisma.document.findMany({
      where,
      select: {
        id: true,
        type: true,
        documentNumber: true,
        customInvoiceNumber: true,
        status: true,
        documentDate: true,
        grandTotal: true,
        vatEnabled: true,
        customerSnapshot: true,
        createdAt: true,
        receiptPaymentType: true,
        isDepositInvoice: true,
        netPayable: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return serialize(data);
  } catch {
    // May fail if enum values (e.g. RECEIPT) don't exist in DB yet
    return [];
  }
}

export async function getConfirmedQuotations(params?: { year?: number; month?: number }) {
  try {
    const where: any = {
      type: "QUOTATION",
      status: "CONFIRMED",
      // A quotation stays selectable for the final invoice as long as no
      // non-cancelled *final* invoice has been issued off it yet — deposit
      // invoices don't consume it (there can be several of those).
      invoices: { none: { status: { not: "CANCELLED" }, isDepositInvoice: false } },
    };
    if (params?.year && params?.month) {
      const startDate = new Date(Date.UTC(params.year, params.month - 1, 1));
      const endDate = new Date(Date.UTC(params.year, params.month, 1));
      where.documentDate = { gte: startDate, lt: endDate };
    }
    const data = await prisma.document.findMany({
      where,
      select: {
        id: true,
        documentNumber: true,
        documentDate: true,
        grandTotal: true,
        customerSnapshot: true,
        companyId: true,
        customerId: true,
        vatEnabled: true,
        vatRate: true,
        discountType: true,
        discountValue: true,
        shippingCost: true,
        shippingLocation: true,
        freeShipping: true,
        freeShippingLocation: true,
        pickupAtShowroom: true,
        footerNotes: true,
        productionDaysMin: true,
        productionDaysMax: true,
        skipWeekends: true,
        skipHolidays: true,
        lineItems: { orderBy: { sequence: "asc" } },
        paymentTerms: { orderBy: { sequence: "asc" } },
        // Deposit invoices already issued off this quotation — candidates for
        // deduction on the final invoice.
        invoices: {
          where: { isDepositInvoice: true, status: { not: "CANCELLED" } },
          select: {
            id: true,
            documentNumber: true,
            documentDate: true,
            grandTotal: true,
            depositPercent: true,
          },
          orderBy: { documentDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getReceiptInvoices() {
  const data = await prisma.document.findMany({
    where: { type: "INVOICE", status: { in: ["BILLED", "DEPOSITED", "PAID"] } },
    include: {
      lineItems: { orderBy: { sequence: "asc" } },
      paymentTerms: { orderBy: { sequence: "asc" } },
      receipts: { where: { status: "PAID", type: "RECEIPT" }, select: { id: true, netPayable: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return serialize(data.filter((invoice) =>
    Math.round(Number(invoice.netPayable) * 100) > invoice.receipts.reduce((sum, r) => sum + Math.round(Number(r.netPayable) * 100), 0)
  ));
}

export async function getDocumentById(id: string) {
  try {
    const data = await prisma.document.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sequence: "asc" } },
        paymentTerms: { orderBy: { sequence: "asc" } },
        depositDeductions: { orderBy: { sequence: "asc" } },
        sourceInvoice: { include: {
          paymentTerms: { orderBy: { sequence: "asc" } },
          receipts: { where: { status: "PAID", type: "RECEIPT" }, select: { id: true, netPayable: true } },
        } },
        company: true,
        customer: true,
        createdBy: true,
      },
    });
    return serialize(data);
  } catch {
    return null;
  }
}
