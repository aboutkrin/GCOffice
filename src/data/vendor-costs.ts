import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

let tablesCreated = false;

export async function ensureVendorCostTables() {
  if (tablesCreated) return;

  try {
    await prisma.$queryRaw`SELECT 1 FROM vendor_costs LIMIT 1`;
    tablesCreated = true;
  } catch {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "vendor_costs" (
          "id" TEXT NOT NULL,
          "document_id" TEXT,
          "vendor_name" TEXT NOT NULL,
          "order_number" TEXT,
          "order_date" DATE NOT NULL,
          "exchange_rate" DECIMAL(10,4),
          "shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
          "other_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
          "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
          "payment_method" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER',
          "notes" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "vendor_costs_pkey" PRIMARY KEY ("id")
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "vendor_costs_document_id_idx" ON "vendor_costs"("document_id")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "vendor_costs_order_date_idx" ON "vendor_costs"("order_date")
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "vendor_costs" ADD CONSTRAINT "vendor_costs_document_id_fkey"
        FOREIGN KEY ("document_id") REFERENCES "documents"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
      `).catch(() => {});

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "vendor_cost_items" (
          "id" TEXT NOT NULL,
          "vendor_cost_id" TEXT NOT NULL,
          "sequence" INTEGER NOT NULL,
          "product_name" TEXT NOT NULL,
          "product_sku" TEXT,
          "quantity" INTEGER NOT NULL,
          "unit_cost" DECIMAL(12,2) NOT NULL,
          "line_total" DECIMAL(12,2) NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "vendor_cost_items_pkey" PRIMARY KEY ("id")
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "vendor_cost_items_vendor_cost_id_idx" ON "vendor_cost_items"("vendor_cost_id")
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "vendor_cost_items" ADD CONSTRAINT "vendor_cost_items_vendor_cost_id_fkey"
        FOREIGN KEY ("vendor_cost_id") REFERENCES "vendor_costs"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
      `).catch(() => {});

      tablesCreated = true;
    } catch {
      // Tables might already exist partially
    }
  }
}

export async function getVendorCosts(params?: {
  search?: string;
  month?: number;
  year?: number;
  documentId?: string;
}) {
  await ensureVendorCostTables();

  try {
    const where: any = {};

    if (params?.documentId) {
      where.documentId = params.documentId;
    }

    if (params?.search) {
      where.OR = [
        { vendorName: { contains: params.search, mode: "insensitive" } },
        { orderNumber: { contains: params.search, mode: "insensitive" } },
        { notes: { contains: params.search, mode: "insensitive" } },
        { document: { documentNumber: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    if (params?.month && params?.year) {
      const startDate = new Date(Date.UTC(params.year, params.month - 1, 1));
      const endDate = new Date(Date.UTC(params.year, params.month, 1));
      where.orderDate = { gte: startDate, lt: endDate };
    } else if (params?.year) {
      const startDate = new Date(Date.UTC(params.year, 0, 1));
      const endDate = new Date(Date.UTC(params.year + 1, 0, 1));
      where.orderDate = { gte: startDate, lt: endDate };
    }

    const vendorCosts = await prisma.vendorCost.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            documentNumber: true,
            type: true,
            status: true,
            grandTotal: true,
            customer: {
              select: { customerName: true, companyName: true },
            },
          },
        },
        items: { orderBy: { sequence: "asc" } },
      },
      orderBy: { orderDate: "desc" },
    });

    return serialize(vendorCosts);
  } catch {
    return [];
  }
}

export async function getVendorCostById(id: string) {
  await ensureVendorCostTables();

  try {
    const vendorCost = await prisma.vendorCost.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            documentNumber: true,
            type: true,
            grandTotal: true,
            customer: {
              select: { customerName: true, companyName: true },
            },
          },
        },
        items: { orderBy: { sequence: "asc" } },
      },
    });
    return serialize(vendorCost);
  } catch {
    return null;
  }
}

export async function getInvoicesForSelect() {
  try {
    const documents = await prisma.document.findMany({
      where: {
        type: "INVOICE",
        status: { in: ["DEPOSITED", "PAID"] },
      },
      select: {
        id: true,
        documentNumber: true,
        grandTotal: true,
        documentDate: true,
        customer: {
          select: { customerName: true, companyName: true },
        },
        lineItems: {
          select: {
            sequence: true,
            productName: true,
            productSku: true,
            productImage: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { documentDate: "desc" },
    });
    return serialize(documents);
  } catch {
    return [];
  }
}
