import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export async function getDocuments(params?: {
  type?: DocumentType;
  status?: DocumentStatus;
  search?: string;
}) {
  const where: any = {};
  if (params?.type) where.type = params.type;
  if (params?.status) where.status = params.status;
  if (params?.search) {
    where.OR = [
      { documentNumber: { contains: params.search, mode: "insensitive" } },
      {
        customerSnapshot: {
          path: ["customerName"],
          string_contains: params.search,
        },
      },
    ];
  }

  const data = await prisma.document.findMany({
    where,
    select: {
      id: true,
      type: true,
      documentNumber: true,
      status: true,
      documentDate: true,
      grandTotal: true,
      customerSnapshot: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return serialize(data);
}

export async function getConfirmedQuotations() {
  const data = await prisma.document.findMany({
    where: {
      type: "QUOTATION",
      status: "CONFIRMED",
    },
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
      footerNotes: true,
      productionDaysMin: true,
      productionDaysMax: true,
      skipWeekends: true,
      skipHolidays: true,
      lineItems: { orderBy: { sequence: "asc" } },
      paymentTerms: { orderBy: { sequence: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return serialize(data);
}

export async function getDocumentById(id: string) {
  const data = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      documentNumber: true,
      status: true,
      documentDate: true,
      companyId: true,
      companySnapshot: true,
      customerId: true,
      customerSnapshot: true,
      subtotal: true,
      discountType: true,
      discountValue: true,
      discountAmount: true,
      vatEnabled: true,
      vatRate: true,
      vatAmount: true,
      grandTotal: true,
      footerNotes: true,
      productionDays: true,
      productionDaysMin: true,
      productionDaysMax: true,
      skipWeekends: true,
      skipHolidays: true,
      deliveryDateStart: true,
      deliveryDateEnd: true,
      sourceQuotationId: true,
      createdAt: true,
      updatedAt: true,
      lineItems: { orderBy: { sequence: "asc" } },
      paymentTerms: { orderBy: { sequence: "asc" } },
      company: true,
      customer: true,
      createdBy: true,
    },
  });
  return serialize(data);
}
