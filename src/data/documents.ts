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
    include: {
      lineItems: { orderBy: { sequence: "asc" } },
      paymentTerms: { orderBy: { sequence: "asc" } },
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
    include: {
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
    include: {
      lineItems: { orderBy: { sequence: "asc" } },
      paymentTerms: { orderBy: { sequence: "asc" } },
      company: true,
      customer: true,
      createdBy: true,
    },
  });
  return serialize(data);
}
