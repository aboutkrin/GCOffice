"use server";

import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";
import { requireUserAction, assertAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { serialize } from "@/lib/utils";

export async function createCustomer(data: unknown) {
  const validated = customerSchema.parse(data);
  const user = await requireUserAction();

  const customer = await prisma.$transaction(async (tx) => {
    const last = await tx.customer.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });

    const lastNum = last ? parseInt(last.code.replace("CUS-", ""), 10) : 0;
    const nextCode = `CUS-${String(lastNum + 1).padStart(4, "0")}`;

    return tx.customer.create({
      data: { ...validated, code: nextCode, createdById: user.id },
    });
  });

  revalidatePath("/customers");
  return customer;
}

export async function updateCustomer(id: string, data: unknown) {
  await requireUserAction();
  const validated = customerSchema.parse(data);
  const customer = await prisma.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      where: { id },
      data: validated,
    });
    // Refresh the customer snapshot on every document of this customer so
    // lists, search and printouts show the edited name/address.
    await tx.document.updateMany({
      where: { customerId: id },
      data: { customerSnapshot: serialize(updated) },
    });
    return updated;
  });
  revalidatePath("/customers");
  revalidatePath("/quotations");
  revalidatePath("/invoices");
  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  return customer;
}

export async function deleteCustomer(id: string) {
  await assertAdmin();
  await prisma.customer.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  revalidatePath("/customers");
}
