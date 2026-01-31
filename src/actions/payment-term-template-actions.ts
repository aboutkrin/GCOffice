"use server";

import { prisma } from "@/lib/prisma";
import { paymentTermTemplateSchema } from "@/lib/validators";
import { serialize } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createPaymentTermTemplate(data: unknown) {
  const validated = paymentTermTemplateSchema.parse(data);
  const template = await prisma.paymentTermTemplate.create({
    data: {
      name: validated.name,
      status: validated.status,
      items: {
        create: validated.items.map((item) => ({
          sequence: item.sequence,
          name: item.name,
          type: item.type,
          value: item.value,
          note: item.note,
        })),
      },
    },
    include: { items: true },
  });
  revalidatePath("/payment-terms");
  return serialize(template);
}

export async function updatePaymentTermTemplate(id: string, data: unknown) {
  const validated = paymentTermTemplateSchema.parse(data);

  // Delete old items and recreate
  await prisma.paymentTermTemplateItem.deleteMany({
    where: { templateId: id },
  });

  const template = await prisma.paymentTermTemplate.update({
    where: { id },
    data: {
      name: validated.name,
      status: validated.status,
      items: {
        create: validated.items.map((item) => ({
          sequence: item.sequence,
          name: item.name,
          type: item.type,
          value: item.value,
          note: item.note,
        })),
      },
    },
    include: { items: true },
  });
  revalidatePath("/payment-terms");
  return serialize(template);
}

export async function deletePaymentTermTemplate(id: string) {
  await prisma.paymentTermTemplate.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  revalidatePath("/payment-terms");
}
