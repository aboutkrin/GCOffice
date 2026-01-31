import { PrismaClient } from "@/generated/prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function generateProductSku(
  categoryId: string,
  tx: TxClient
): Promise<string> {
  const category = await tx.productCategory.update({
    where: { id: categoryId },
    data: { lastNumber: { increment: 1 } },
    select: { prefix: true, lastNumber: true },
  });

  if (!category.prefix) {
    throw new Error("หมวดหมู่นี้ยังไม่ได้ตั้งค่ารหัสนำหน้า (prefix)");
  }

  const paddedNumber = String(category.lastNumber).padStart(4, "0");
  return `${category.prefix}-${paddedNumber}`;
}
