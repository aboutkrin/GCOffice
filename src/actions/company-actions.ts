"use server";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { companySchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createCompany(data: unknown) {
  const validated = companySchema.parse(data);
  const company = await prisma.company.create({ data: validated });
  revalidatePath("/companies");
  return serialize(company);
}

export async function updateCompany(id: string, data: unknown) {
  const validated = companySchema.parse(data);
  const company = await prisma.company.update({
    where: { id },
    data: validated,
  });
  revalidatePath("/companies");
  return serialize(company);
}

export async function deleteCompany(id: string) {
  await prisma.company.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  revalidatePath("/companies");
}
