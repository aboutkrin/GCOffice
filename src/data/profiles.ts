import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function getProfileById(id: string) {
  const data = await prisma.profile.findUnique({ where: { id } });
  return serialize(data);
}
