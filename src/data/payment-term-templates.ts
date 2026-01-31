import { prisma } from "@/lib/prisma";
import { Status } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export async function getPaymentTermTemplates(params?: {
  search?: string;
  status?: Status;
}) {
  const where: any = {};
  if (params?.status) where.status = params.status;
  if (params?.search) {
    where.name = { contains: params.search, mode: "insensitive" };
  }

  const data = await prisma.paymentTermTemplate.findMany({
    where,
    include: { items: { orderBy: { sequence: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return serialize(data);
}

export async function getPaymentTermTemplateById(id: string) {
  const data = await prisma.paymentTermTemplate.findUnique({
    where: { id },
    include: { items: { orderBy: { sequence: "asc" } } },
  });
  return serialize(data);
}

export async function getActivePaymentTermTemplates() {
  const data = await prisma.paymentTermTemplate.findMany({
    where: { status: "ACTIVE" },
    include: { items: { orderBy: { sequence: "asc" } } },
    orderBy: { name: "asc" },
  });
  return serialize(data);
}
