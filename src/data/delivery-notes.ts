import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { serialize } from "@/lib/utils";
import { flattenLineItemSpecs } from "@/lib/line-item-specs";

export interface DeliveryNoteLine {
  sequence: number;
  productSku: string;
  productName: string;
  colorVariantName: string | null;
  colorVariantSku: string | null;
  /** Ordered on the quotation; null for an extra item not on it. */
  ordered: number | null;
  /** Shipped in this round. */
  quantity: number;
  /** Still to ship after this round; null for an extra item. */
  remaining: number | null;
  unitLabel: string | null;
  /** Colour variant image, else the product image. */
  imageUrl: string | null;
}

export interface DeliveryNoteData {
  id: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  issueNumber: string;
  deliveryNumber: string | null;
  deliveryDate: string;
  /** 1-based delivery round within the quotation; null while a draft / cancelled. */
  round: number | null;
  quotation: { id: string; documentNumber: string | null; documentDate: string };
  company: {
    name: string;
    address?: string | null;
    taxId?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
  };
  customer: {
    customerName?: string | null;
    companyName?: string | null;
    contactPerson?: string | null;
    address?: string | null;
    phone?: string | null;
    taxId?: string | null;
  };
  deliveryAddress: string | null;
  deliveryContactName: string | null;
  deliveryContactPhone: string | null;
  customerPoNumber: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
  carrierName: string | null;
  deliveryRemark: string | null;
  lines: DeliveryNoteLine[];
}

/**
 * ใบส่งสินค้า for an ISSUE stock document against a quotation. One issue is
 * one delivery round; "remaining" counts every posted round up to and
 * including this one (or, for a draft, all posted rounds plus this one).
 */
export async function getDeliveryNote(stockDocumentId: string): Promise<DeliveryNoteData | null> {
  const doc = await prisma.stockDocument.findUnique({
    where: { id: stockDocumentId },
    include: {
      lines: {
        orderBy: { sequence: "asc" },
        include: {
          product: { select: { websiteSpecs: true, imageUrl: true } },
          colorVariant: { select: { sku: true, imageUrl: true } },
          sourceLineItem: { select: { colorVariantSku: true } },
        },
      },
      sourceDocument: {
        select: {
          id: true,
          documentNumber: true,
          documentDate: true,
          companySnapshot: true,
          customerSnapshot: true,
          company: {
            select: { name: true, address: true, taxId: true, phone: true, email: true, logoUrl: true },
          },
          customer: {
            select: {
              customerName: true,
              companyName: true,
              contactPerson: true,
              address: true,
              phone: true,
              taxId: true,
            },
          },
          lineItems: { select: { id: true, quantity: true } },
        },
      },
    },
  });
  if (!doc || doc.type !== "ISSUE" || !doc.sourceDocument) return null;
  const source = doc.sourceDocument;

  // Every posted round of this quotation, oldest first.
  const rounds = await prisma.stockDocument.findMany({
    where: { sourceDocumentId: source.id, type: "ISSUE", status: "POSTED" },
    orderBy: [{ postedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      lines: { select: { sourceLineItemId: true, quantity: true } },
    },
  });
  const roundIndex = rounds.findIndex((r) => r.id === doc.id);
  // Rounds that count towards "shipped so far" on this note.
  const counted =
    doc.status === "POSTED" ? rounds.slice(0, roundIndex + 1) : doc.status === "DRAFT" ? rounds : [];
  const shipped = new Map<string, number>();
  for (const round of counted) {
    for (const line of round.lines) {
      if (!line.sourceLineItemId) continue;
      shipped.set(line.sourceLineItemId, (shipped.get(line.sourceLineItemId) ?? 0) + line.quantity);
    }
  }
  if (doc.status !== "POSTED") {
    for (const line of doc.lines) {
      if (!line.sourceLineItemId) continue;
      shipped.set(line.sourceLineItemId, (shipped.get(line.sourceLineItemId) ?? 0) + line.quantity);
    }
  }
  const orderedById = new Map(source.lineItems.map((li) => [li.id, li.quantity]));

  const shippedLines = doc.lines.filter((line) => line.quantity > 0);
  const withSpecs = await flattenLineItemSpecs(
    shippedLines.map((line) => ({ ...line, productSku: line.productSku || null })),
  );

  const lines: DeliveryNoteLine[] = withSpecs.map((line, index) => {
    const ordered = line.sourceLineItemId ? orderedById.get(line.sourceLineItemId) ?? null : null;
    return {
      sequence: index + 1,
      productSku: line.productSku ?? "",
      productName: line.productName,
      colorVariantName: line.colorVariantName,
      colorVariantSku: line.sourceLineItem?.colorVariantSku ?? line.colorVariant?.sku ?? null,
      ordered,
      quantity: line.quantity,
      remaining:
        ordered == null ? null : Math.max(0, ordered - (shipped.get(line.sourceLineItemId!) ?? 0)),
      unitLabel: line.unitLabel,
      imageUrl: line.colorVariant?.imageUrl ?? shippedLines[index].product?.imageUrl ?? null,
    };
  });

  const companySnapshot = (source.companySnapshot ?? {}) as DeliveryNoteData["company"];
  const customerSnapshot = (source.customerSnapshot ?? {}) as DeliveryNoteData["customer"];

  return serialize({
    id: doc.id,
    status: doc.status,
    issueNumber: doc.documentNumber,
    deliveryNumber: doc.deliveryNumber,
    deliveryDate: doc.documentDate.toISOString(),
    round: doc.status === "POSTED" && roundIndex >= 0 ? roundIndex + 1 : null,
    quotation: {
      id: source.id,
      documentNumber: source.documentNumber,
      documentDate: source.documentDate.toISOString(),
    },
    // Live company / customer data, like the quotation preview.
    company: source.company ?? companySnapshot,
    customer: source.customer ?? customerSnapshot,
    deliveryAddress: doc.deliveryAddress,
    deliveryContactName: doc.deliveryContactName,
    deliveryContactPhone: doc.deliveryContactPhone,
    customerPoNumber: doc.customerPoNumber,
    vehiclePlate: doc.vehiclePlate,
    driverName: doc.driverName,
    carrierName: doc.carrierName,
    deliveryRemark: doc.deliveryRemark,
    lines,
  }) as DeliveryNoteData;
}

/** Delivery rounds of one quotation for its "การส่งสินค้า" card. */
export async function getDeliveryRounds(documentId: string) {
  const rounds = await prisma.stockDocument.findMany({
    where: { sourceDocumentId: documentId, type: "ISSUE", status: { not: "CANCELLED" } },
    orderBy: [{ postedAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      documentNumber: true,
      deliveryNumber: true,
      documentDate: true,
      postedAt: true,
      lines: { select: { quantity: true } },
    },
  });
  return serialize(
    rounds.map(({ lines, ...round }) => ({
      ...round,
      totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    })),
  );
}

export interface DeliveryNoteListItem {
  id: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  issueNumber: string;
  deliveryNumber: string | null;
  /** The issue's document date (editable on the issue page). */
  date: string;
  quotation: { id: string; documentNumber: string | null };
  customerName: string;
  totalQuantity: number;
  createdBy: string;
}

/** A quotation that matched the search but has no delivery round yet. */
export interface DeliveryNoteSuggestion {
  id: string;
  documentNumber: string | null;
  customerName: string;
  /** The invoice number that matched, when the search hit an invoice of this quotation. */
  matchedInvoiceNumber: string | null;
}

function pickCustomerName(
  customer: { type?: string | null; customerName?: string | null; companyName?: string | null } | null | undefined,
  snapshot: unknown,
) {
  const c = customer ?? ((snapshot ?? {}) as Record<string, string | null | undefined>);
  return (c.type === "COMPANY" && c.companyName) || c.customerName || c.companyName || "-";
}

/**
 * ใบส่งสินค้า list for the /delivery-notes menu: every ISSUE stock document
 * raised against a quotation (one per delivery round), newest first.
 */
export async function getDeliveryNotes(params?: { search?: string; page?: number; perPage?: number }) {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const search = params?.search?.trim();

  const where: Prisma.StockDocumentWhereInput = {
    type: "ISSUE",
    sourceDocumentId: { not: null },
    ...(search
      ? {
          OR: [
            { deliveryNumber: { contains: search, mode: "insensitive" } },
            { documentNumber: { contains: search, mode: "insensitive" } },
            { customerPoNumber: { contains: search, mode: "insensitive" } },
            { sourceDocument: { documentNumber: { contains: search, mode: "insensitive" } } },
            // Invoices issued from the quotation (ใบส่งสินค้า hang off the quotation, not the invoice).
            { sourceDocument: { invoices: { some: { documentNumber: { contains: search, mode: "insensitive" } } } } },
            { sourceDocument: { customer: { customerName: { contains: search, mode: "insensitive" } } } },
            { sourceDocument: { customer: { companyName: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  try {
    const [rows, total] = await Promise.all([
      prisma.stockDocument.findMany({
        where,
        orderBy: [{ postedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          status: true,
          documentNumber: true,
          deliveryNumber: true,
          documentDate: true,
          postedAt: true,
          createdBy: { select: { fullName: true, username: true } },
          lines: { select: { quantity: true } },
          sourceDocument: {
            select: {
              id: true,
              documentNumber: true,
              customerSnapshot: true,
              customer: { select: { type: true, customerName: true, companyName: true } },
            },
          },
        },
      }),
      prisma.stockDocument.count({ where }),
    ]);

    const notes: DeliveryNoteListItem[] = rows.map((row) => {
      const customerName = pickCustomerName(row.sourceDocument?.customer, row.sourceDocument?.customerSnapshot);
      return {
        id: row.id,
        status: row.status,
        issueNumber: row.documentNumber,
        deliveryNumber: row.deliveryNumber,
        date: row.documentDate.toISOString(),
        quotation: { id: row.sourceDocument!.id, documentNumber: row.sourceDocument!.documentNumber },
        customerName,
        totalQuantity: row.lines.reduce((sum, l) => sum + l.quantity, 0),
        createdBy: row.createdBy?.fullName || row.createdBy?.username || "-",
      };
    });
    const suggestions = search && total === 0 ? await findQuotationsWithoutRounds(search) : [];
    return { notes, total, suggestions };
  } catch (error) {
    console.error("getDeliveryNotes failed", error);
    return { notes: [] as DeliveryNoteListItem[], total: 0, suggestions: [] as DeliveryNoteSuggestion[] };
  }
}

/**
 * When a search finds no delivery note, look for the quotation (or the
 * quotation behind an invoice) the user typed so the page can say "this
 * quotation has no delivery round yet" instead of "no delivery notes".
 */
async function findQuotationsWithoutRounds(search: string): Promise<DeliveryNoteSuggestion[]> {
  const docs = await prisma.document.findMany({
    where: {
      status: { not: "CANCELLED" },
      documentNumber: { contains: search, mode: "insensitive" },
      type: { in: ["QUOTATION", "INVOICE"] },
    },
    orderBy: { documentDate: "desc" },
    take: 5,
    select: {
      id: true,
      type: true,
      documentNumber: true,
      customerSnapshot: true,
      customer: { select: { type: true, customerName: true, companyName: true } },
      sourceQuotation: {
        select: {
          id: true,
          documentNumber: true,
          customerSnapshot: true,
          customer: { select: { type: true, customerName: true, companyName: true } },
        },
      },
    },
  });

  const seen = new Set<string>();
  const suggestions: DeliveryNoteSuggestion[] = [];
  for (const doc of docs) {
    const quotation = doc.type === "INVOICE" ? doc.sourceQuotation : doc;
    if (!quotation || seen.has(quotation.id)) continue;
    seen.add(quotation.id);
    suggestions.push({
      id: quotation.id,
      documentNumber: quotation.documentNumber,
      customerName: pickCustomerName(quotation.customer, quotation.customerSnapshot),
      matchedInvoiceNumber: doc.type === "INVOICE" ? doc.documentNumber : null,
    });
  }
  return suggestions;
}
