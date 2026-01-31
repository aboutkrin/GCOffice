"use server";

import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createCustomer(data: unknown) {
  const validated = customerSchema.parse(data);

  const customer = await prisma.$transaction(async (tx) => {
    const last = await tx.customer.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });

    const lastNum = last ? parseInt(last.code.replace("CUS-", ""), 10) : 0;
    const nextCode = `CUS-${String(lastNum + 1).padStart(4, "0")}`;

    return tx.customer.create({
      data: { ...validated, code: nextCode },
    });
  });

  revalidatePath("/customers");
  return customer;
}

export async function updateCustomer(id: string, data: unknown) {
  const validated = customerSchema.parse(data);
  const customer = await prisma.customer.update({
    where: { id },
    data: validated,
  });
  revalidatePath("/customers");
  return customer;
}

export async function deleteCustomer(id: string) {
  await prisma.customer.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  revalidatePath("/customers");
}
