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

  try {
    const data = await prisma.paymentTermTemplate.findMany({
      where,
      include: { items: { orderBy: { sequence: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getPaymentTermTemplateById(id: string) {
  try {
    const data = await prisma.paymentTermTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { sequence: "asc" } } },
    });
    return serialize(data);
  } catch {
    return null;
  }
}

export async function getActivePaymentTermTemplates() {
  try {
    const data = await prisma.paymentTermTemplate.findMany({
      where: { status: "ACTIVE" },
      include: { items: { orderBy: { sequence: "asc" } } },
      orderBy: { name: "asc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}
