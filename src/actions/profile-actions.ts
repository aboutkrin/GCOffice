"use server";

import { prisma } from "@/lib/prisma";
import { requireUserAction } from "@/lib/auth";
import { profileSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: unknown) {
  const user = await requireUserAction();
  const validated = profileSchema.parse(data);

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      firstName: validated.firstName,
      lastName: validated.lastName,
      signatureUrl: validated.signatureUrl || null,
      bankName: validated.bankName?.trim() || null,
      bankAccountName: validated.bankAccountName?.trim() || null,
      bankAccountNumber: validated.bankAccountNumber?.trim() || null,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}
