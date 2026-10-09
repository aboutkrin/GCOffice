import "server-only";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { normalizeCode, normalizeSupplier } from "@/lib/landed-cost";
import type { LandedCostIndex } from "@/lib/line-cost";

export { resolveLineCost, type CostSource, type LandedCostIndex } from "@/lib/line-cost";

export async function getImportLots(params?: { search?: string; year?: number }) {
  const where: Record<string, unknown> = {};
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { lotNumber: { contains: params.search, mode: "insensitive" } },
      { notes: { contains: params.search, mode: "insensitive" } },
      { invoices: { some: { supplierName: { contains: params.search, mode: "insensitive" } } } },
      { invoices: { some: { piNumber: { contains: params.search, mode: "insensitive" } } } },
      { invoices: { some: { items: { some: { supplierCode: { contains: params.search, mode: "insensitive" } } } } } },
    ];
  }
  if (params?.year) {
    where.orderDate = {
      gte: new Date(Date.UTC(params.year, 0, 1)),
      lt: new Date(Date.UTC(params.year + 1, 0, 1)),
    };
  }

  const lots = await prisma.importLot.findMany({
    where,
    include: {
      chinaShipment: { select: { id: true, title: true, containerNo: true, status: true } },
      invoices: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          supplierName: true,
          piNumber: true,
          items: { select: { boxes: true, productId: true } },
        },
      },
    },
    orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
  });

  return serialize(
    lots.map((lot) => {
      const items = lot.invoices.flatMap((inv) => inv.items);
      return {
        id: lot.id,
        name: lot.name,
        lotNumber: lot.lotNumber,
        orderDate: lot.orderDate,
        transportMode: lot.transportMode,
        totalWeightKg: lot.totalWeightKg,
        totalLanded: lot.totalLanded,
        chinaShipment: lot.chinaShipment,
        suppliers: [...new Set(lot.invoices.map((inv) => inv.supplierName))],
        piNumbers: lot.invoices.map((inv) => inv.piNumber).filter(Boolean) as string[],
        totalBoxes: items.reduce((s, it) => s + it.boxes, 0),
        itemCount: items.length,
        unmatchedCount: items.filter((it) => !it.productId).length,
      };
    })
  );
}

export async function getImportLotById(id: string) {
  const lot = await prisma.importLot.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { sequence: "asc" },
        include: {
          items: {
            orderBy: { sequence: "asc" },
            include: {
              product: { select: { id: true, name: true, sku: true, imageUrl: true } },
              colorVariant: { select: { id: true, name: true, sku: true, imageUrl: true } },
            },
          },
        },
      },
    },
  });
  return lot ? serialize(lot) : null;
}

export async function getChinaShipmentsForSelect(includeId?: string | null) {
  const shipments = await prisma.chinaShipment.findMany({
    where: {
      OR: [
        { status: { not: "CANCELLED" } },
        ...(includeId ? [{ id: includeId }] : []),
      ],
    },
    select: { id: true, title: true, containerNo: true, shippedDate: true, status: true },
    orderBy: { shippedDate: "desc" },
    take: 50,
  });
  return serialize(shipments);
}

// ------------------------------------------------------------------
// Supplier code → our product / colour
// ------------------------------------------------------------------

export type MatchSource = "alias" | "variantSku" | "productSku" | "name";

export interface SupplierCodeMatch {
  productId: string;
  colorVariantId: string | null;
  productName: string;
  productSku: string;
  variantName: string | null;
  variantSku: string | null;
  imageUrl: string | null;
  matchedBy: MatchSource;
}

/**
 * Match order: remembered alias for this supplier → website colour code
 * (ProductColorVariant.sku) → alias saved under another supplier (only when
 * unambiguous) → our product SKU → product name containing the code.
 * Codes compare normalized (case, dashes and spaces ignored).
 */
export async function matchSupplierCodes(
  supplierName: string,
  codes: string[]
): Promise<Record<string, SupplierCodeMatch | null>> {
  const keys = [...new Set(codes.map(normalizeCode).filter(Boolean))];
  const result: Record<string, SupplierCodeMatch | null> = {};
  if (keys.length === 0) return result;
  const supplierKey = normalizeSupplier(supplierName);

  const [aliases, variants, products] = await Promise.all([
    prisma.supplierCodeAlias.findMany({
      where: { codeKey: { in: keys } },
      include: {
        product: { select: { id: true, name: true, sku: true, imageUrl: true } },
        colorVariant: { select: { id: true, name: true, sku: true, imageUrl: true } },
      },
    }),
    prisma.productColorVariant.findMany({
      where: { sku: { not: null } },
      select: {
        id: true,
        name: true,
        sku: true,
        imageUrl: true,
        product: { select: { id: true, name: true, sku: true, imageUrl: true, status: true } },
      },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, imageUrl: true, status: true },
    }),
  ]);

  type V = (typeof variants)[number];
  type P = (typeof products)[number];
  const fromVariant = (v: V, matchedBy: MatchSource): SupplierCodeMatch => ({
    productId: v.product.id,
    colorVariantId: v.id,
    productName: v.product.name,
    productSku: v.product.sku,
    variantName: v.name,
    variantSku: v.sku,
    imageUrl: v.imageUrl || v.product.imageUrl,
    matchedBy,
  });
  const fromProduct = (p: P, matchedBy: MatchSource): SupplierCodeMatch => ({
    productId: p.id,
    colorVariantId: null,
    productName: p.name,
    productSku: p.sku,
    variantName: null,
    variantSku: null,
    imageUrl: p.imageUrl,
    matchedBy,
  });
  const fromAlias = (a: (typeof aliases)[number]): SupplierCodeMatch => ({
    productId: a.product.id,
    colorVariantId: a.colorVariant?.id ?? null,
    productName: a.product.name,
    productSku: a.product.sku,
    variantName: a.colorVariant?.name ?? null,
    variantSku: a.colorVariant?.sku ?? null,
    imageUrl: a.colorVariant?.imageUrl || a.product.imageUrl,
    matchedBy: "alias",
  });

  // Prefer active products when the same code exists twice
  const activeFirst = <T extends { status?: string }>(list: T[]) =>
    [...list].sort((a, b) => (a.status === "ACTIVE" ? 0 : 1) - (b.status === "ACTIVE" ? 0 : 1));

  for (const key of keys) {
    const own = aliases.find((a) => a.codeKey === key && a.supplierKey === supplierKey);
    if (own) {
      result[key] = fromAlias(own);
      continue;
    }

    const variantHits = activeFirst(
      variants
        .filter((v) => normalizeCode(v.sku) === key)
        .map((v) => ({ ...v, status: v.product.status }))
    );
    if (variantHits.length > 0) {
      result[key] = fromVariant(variantHits[0], "variantSku");
      continue;
    }

    const otherAliases = aliases.filter((a) => a.codeKey === key);
    const targets = new Set(otherAliases.map((a) => `${a.productId}:${a.colorVariantId ?? ""}`));
    if (otherAliases.length > 0 && targets.size === 1) {
      result[key] = fromAlias(otherAliases[0]);
      continue;
    }

    const productHit = activeFirst(products.filter((p) => normalizeCode(p.sku) === key))[0];
    if (productHit) {
      result[key] = fromProduct(productHit, "productSku");
      continue;
    }

    if (key.length >= 4) {
      const nameHits = activeFirst(products.filter((p) => normalizeCode(p.name).includes(key)));
      if (nameHits.length === 1) {
        result[key] = fromProduct(nameHits[0], "name");
        continue;
      }
    }

    result[key] = null;
  }

  return result;
}

// ------------------------------------------------------------------
// Landed cost per box, averaged over every import lot line
// ------------------------------------------------------------------

export async function getLandedCostIndex(productIds: string[]): Promise<LandedCostIndex> {
  const ids = [...new Set(productIds.filter(Boolean))];
  const index: LandedCostIndex = { byVariant: {}, byProduct: {}, legacy: {} };
  if (ids.length === 0) return index;

  const [groups, products] = await Promise.all([
    prisma.supplierInvoiceItem.groupBy({
      by: ["productId", "colorVariantId"],
      where: { productId: { in: ids } },
      _sum: { boxes: true, landedTotal: true },
    }),
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, costPrice: true, exchangeRate: true, weightPerBox: true, shippingCostPerBox: true },
    }),
  ]);

  const productSums: Record<string, { boxes: number; total: number }> = {};
  for (const g of groups) {
    if (!g.productId) continue;
    const boxes = g._sum.boxes ?? 0;
    const total = Number(g._sum.landedTotal ?? 0);
    if (boxes <= 0) continue;
    if (g.colorVariantId) {
      index.byVariant[g.colorVariantId] = Math.round((total / boxes) * 100) / 100;
    }
    const ps = (productSums[g.productId] ??= { boxes: 0, total: 0 });
    ps.boxes += boxes;
    ps.total += total;
  }
  for (const [pid, s] of Object.entries(productSums)) {
    index.byProduct[pid] = Math.round((s.total / s.boxes) * 100) / 100;
  }

  for (const p of products) {
    if (p.costPrice == null) continue;
    const cost =
      Number(p.costPrice) * Number(p.exchangeRate ?? 1) +
      Number(p.shippingCostPerBox ?? 0) * Number(p.weightPerBox ?? 0);
    if (cost > 0) index.legacy[p.id] = Math.round(cost * 100) / 100;
  }

  return index;
}
