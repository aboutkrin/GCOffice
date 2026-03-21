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

export async function mergeCustomers(sourceId: string, targetId: string) {
  if (sourceId === targetId) {
    throw new Error("ไม่สามารถรวมลูกค้าเดียวกันได้");
  }

  await prisma.$transaction(async (tx) => {
    // Verify both customers exist
    const [source, target] = await Promise.all([
      tx.customer.findUnique({ where: { id: sourceId } }),
      tx.customer.findUnique({ where: { id: targetId } }),
    ]);

    if (!source || !target) {
      throw new Error("ไม่พบข้อมูลลูกค้า");
    }

    // Transfer all documents from source to target
    await tx.document.updateMany({
      where: { customerId: sourceId },
      data: { customerId: targetId },
    });

    // Deactivate source customer
    await tx.customer.update({
      where: { id: sourceId },
      data: { status: "INACTIVE" },
    });
  });

  revalidatePath("/customers");
  revalidatePath("/quotations");
  revalidatePath("/invoices");
}
