import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

/** `includeIds` keeps inactive companies that a document being edited/issued still points to. */
export async function getCompanies(params?: { includeIds?: string[] }) {
  try {
    const includeIds = params?.includeIds?.length ? params.includeIds : null;
    const data = await prisma.company.findMany({
      where: includeIds
        ? { OR: [{ status: "ACTIVE" }, { id: { in: includeIds } }] }
        : { status: "ACTIVE" },
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
