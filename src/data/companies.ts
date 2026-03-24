import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getCompanies() {
  try {
    const data = await prisma.company.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getCompanyById(id: string) {
  try {
    const data = await prisma.company.findUnique({ where: { id } });
    return serialize(data);
  } catch {
    return null;
  }
}

export async function getAllCompanies() {
  try {
    const data = await prisma.company.findMany({ orderBy: { name: "asc" } });
    return serialize(data);
  } catch {
    return [];
  }
}
