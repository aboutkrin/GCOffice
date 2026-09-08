import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getUsers() {
  try {
    const data = await prisma.profile.findMany({ orderBy: { createdAt: "desc" } });
    return serialize(data);
  } catch {
    return [];
  }
}

export async function getUserById(id: string) {
  try {
    const data = await prisma.profile.findUnique({ where: { id } });
    return serialize(data);
  } catch {
    return null;
  }
}
