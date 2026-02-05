import { prisma } from "./prisma";
import { DocumentType } from "@/generated/prisma/client";

export async function generateDocumentNumber(type: DocumentType): Promise<string> {
  const now = new Date();
  const buddhistYear = (now.getFullYear() + 543).toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const yearMonth = `${buddhistYear}${month}`;
  const prefixMap: Record<string, string> = {
    QUOTATION: "QT",
    INVOICE: "INV",
    RECEIPT: "RCP",
  };
  const prefix = prefixMap[type] || type;

  const counter = await prisma.documentCounter.upsert({
    where: {
      type_yearMonth: { type, yearMonth },
    },
    update: {
      counter: { increment: 1 },
    },
    create: {
      type,
      yearMonth,
      counter: 1,
    },
  });

  const seq = counter.counter.toString().padStart(4, "0");
  return `${prefix}-${yearMonth}-${seq}`;
}
