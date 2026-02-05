import { prisma } from "@/lib/prisma";
import { CustomerType, Status } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";

export async function getCustomers(params?: {
  search?: string;
  type?: CustomerType;
  status?: Status;
}) {
  const where: any = {};
  if (params?.status) where.status = params.status;
  if (params?.type) where.type = params.type;
  if (params?.search) {
    where.OR = [
      { code: { contains: params.search, mode: "insensitive" } },
      { customerName: { contains: params.search, mode: "insensitive" } },
      { companyName: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search } },
    ];
  }

  const data = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return serialize(data);
}

export async function getCustomerById(id: string) {
  const data = await prisma.customer.findUnique({ where: { id } });
  return serialize(data);
}

export async function searchCustomers(query: string) {
  const data = await prisma.customer.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { customerName: "asc" },
  });
  return serialize(data);
}
