"use server";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { printOrderSettingsSchema } from "@/lib/validators";
import { requireUserAction } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Saves the single shared shop-info row shown on the "print delivery note"
 * (พิมพ์ใบส่งของ) page. Any logged-in user may save it — the print-order
 * page itself isn't admin-only, so this shouldn't be either.
 */
export async function savePrintOrderSettings(data: unknown) {
  await requireUserAction();
  const validated = printOrderSettingsSchema.parse(data);
  const settings = await prisma.printOrderSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...validated },
    update: validated,
  });
  revalidatePath("/print-order");
  return serialize(settings);
}
