/**
 * Landed cost ("ต้นทุนถึงไทย") for an import lot.
 *
 * A lot holds one or more supplier proforma invoices (PI). For every PI line:
 *   goods (CNY)       = the line Amount printed on the PI (not the per-m² price)
 *   PI fees (CNY)     = pallet fee, freight to the agent warehouse... of that PI,
 *                       split over the PI's lines
 *   lot costs (THB)   = China→Thailand freight (weight × THB/kg, or the actual
 *                       forwarder bill) + other lot costs, split over every line
 *                       of every PI in the lot
 *   landed (THB)      = (goods + PI fees share) × exchange rate + lot costs share
 *   landed per box    = landed / boxes
 *
 * Splits go by weight when every line in the group has a weight, otherwise by
 * goods amount. Money is split in satang with the largest-remainder method so
 * the line totals always add up to the lot total exactly.
 *
 * Pure: shared by the client form (live preview) and the server action (stored values).
 */

export interface LandedFeeInput {
  label: string;
  amountCny: number;
}

export interface LandedItemInput {
  boxes: number;
  amountCny: number;
  weightKg?: number | null;
}

export interface LandedInvoiceInput {
  fees: LandedFeeInput[];
  items: LandedItemInput[];
}

export interface LandedLotInput {
  exchangeRate: number;
  ratePerKg: number;
  /** Actual forwarder bill; replaces weight × ratePerKg when set. */
  freightOverride?: number | null;
  otherCost?: number | null;
  invoices: LandedInvoiceInput[];
}

export interface LandedItemResult {
  feeShareCny: number;
  freightShare: number;
  landedTotal: number;
  landedPerBox: number;
}

export interface LandedLotResult {
  totalGoodsCny: number;
  totalFeesCny: number;
  totalWeightKg: number;
  /** True when some line has no weight, so splits fell back to goods amount. */
  missingWeight: boolean;
  freight: number;
  freightEstimated: number;
  otherCost: number;
  totalLanded: number;
  invoices: { goodsCny: number; feesCny: number; items: LandedItemResult[] }[];
}

const toSatang = (n: number) => Math.round((Number(n) || 0) * 100);
const fromSatang = (n: number) => n / 100;
const num = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/**
 * Split `totalSatang` over `weights` proportionally; results are integers that
 * sum to exactly `totalSatang`. All-zero weights split evenly.
 */
export function allocate(totalSatang: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const w = weights.map((x) => Math.max(0, num(x)));
  const sum = w.reduce((a, b) => a + b, 0);
  const basis = sum > 0 ? w : w.map(() => 1);
  const basisSum = sum > 0 ? sum : w.length;

  const raw = basis.map((b) => (totalSatang * b) / basisSum);
  const floored = raw.map((r) => Math.floor(r));
  let remainder = totalSatang - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    floored[order[k].i] += 1;
  }
  return floored;
}

function splitBasis(items: LandedItemInput[]): { weights: number[]; byWeight: boolean } {
  const byWeight = items.length > 0 && items.every((it) => num(it.weightKg) > 0);
  return {
    weights: items.map((it) => (byWeight ? num(it.weightKg) : num(it.amountCny))),
    byWeight,
  };
}

export function computeLandedCosts(lot: LandedLotInput): LandedLotResult {
  const rate = num(lot.exchangeRate);
  const allItems = lot.invoices.flatMap((inv) => inv.items);

  const totalWeightKg = allItems.reduce((s, it) => s + num(it.weightKg), 0);
  const freightEstimated = Math.round(totalWeightKg * num(lot.ratePerKg) * 100) / 100;
  const hasOverride = lot.freightOverride != null && num(lot.freightOverride) > 0;
  const freight = hasOverride ? num(lot.freightOverride) : freightEstimated;
  const otherCost = num(lot.otherCost);

  // Lot-level THB costs, split over every line of the lot
  const lotBasis = splitBasis(allItems);
  const lotShares = allocate(toSatang(freight + otherCost), lotBasis.weights);

  let missingWeight = !lotBasis.byWeight && allItems.length > 0;
  let cursor = 0;
  let totalGoodsCny = 0;
  let totalFeesCny = 0;
  let totalLandedSatang = 0;

  const invoices = lot.invoices.map((inv) => {
    const goodsCny = inv.items.reduce((s, it) => s + num(it.amountCny), 0);
    const feesCny = inv.fees.reduce((s, f) => s + num(f.amountCny), 0);
    totalGoodsCny += goodsCny;
    totalFeesCny += feesCny;

    const basis = splitBasis(inv.items);
    if (!basis.byWeight && inv.items.length > 0) missingWeight = true;
    const feeShares = allocate(toSatang(feesCny), basis.weights);

    const items = inv.items.map((it, idx) => {
      const freightSatang = lotShares[cursor++] ?? 0;
      const feeShareCny = fromSatang(feeShares[idx] ?? 0);
      const landedSatang =
        Math.round((num(it.amountCny) + feeShareCny) * rate * 100) + freightSatang;
      totalLandedSatang += landedSatang;
      const boxes = num(it.boxes);
      return {
        feeShareCny,
        freightShare: fromSatang(freightSatang),
        landedTotal: fromSatang(landedSatang),
        landedPerBox: boxes > 0 ? Math.round(landedSatang / boxes) / 100 : 0,
      };
    });

    return { goodsCny: round2(goodsCny), feesCny: round2(feesCny), items };
  });

  return {
    totalGoodsCny: round2(totalGoodsCny),
    totalFeesCny: round2(totalFeesCny),
    totalWeightKg: round2(totalWeightKg),
    missingWeight,
    freight: round2(freight),
    freightEstimated,
    otherCost: round2(otherCost),
    totalLanded: fromSatang(totalLandedSatang),
    invoices,
  };
}

export function round2(n: number) {
  return Math.round(num(n) * 100) / 100;
}

/** THB/kg defaults per transport mode (editable per lot). */
export const DEFAULT_RATE_PER_KG = { TRUCK: 15, SEA: 10 } as const;

/** Uppercase, alphanumerics only — "YSP125-Q304" and "ysp125 q304" match. */
export function normalizeCode(code: string | null | undefined): string {
  return (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeSupplier(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9฀-๿一-鿿]/g, "");
}
