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

/**
 * Generate the next custom invoice number for receipts.
 * Format: "A YYMM-NNN" where YY = Buddhist year last 2 digits, MM = month, NNN = sequence.
 * Uses documentDate to determine the year-month.
 */
export async function generateCustomInvoiceNumber(documentDate: Date): Promise<string> {
  const buddhistYear = (documentDate.getFullYear() + 543).toString().slice(-2);
  const month = (documentDate.getMonth() + 1).toString().padStart(2, "0");
  const yearMonth = `${buddhistYear}${month}`;
  const prefix = `A ${yearMonth}-`;

  // Find the highest existing custom invoice number for this year-month
  const latest = await prisma.document.findFirst({
    where: {
      customInvoiceNumber: { startsWith: prefix },
    },
    orderBy: { customInvoiceNumber: "desc" },
    select: { customInvoiceNumber: true },
  });

  let nextSeq = 1;
  if (latest?.customInvoiceNumber) {
    const seqPart = latest.customInvoiceNumber.slice(prefix.length);
    const parsed = parseInt(seqPart, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}
