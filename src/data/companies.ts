import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getCompanies() {
  const data = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  return serialize(data);
}

export async function getCompanyById(id: string) {
  const data = await prisma.company.findUnique({ where: { id } });
  return serialize(data);
}

export async function getAllCompanies() {
  const data = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return serialize(data);
}
