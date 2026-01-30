"use server";

import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function createCustomer(data: unknown) {
  const validated = customerSchema.parse(data);
  const customer = await prisma.customer.create({ data: validated });
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
