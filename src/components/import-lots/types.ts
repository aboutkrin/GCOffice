import type { MatchSource, SupplierCodeMatch } from "@/data/import-lots";

/** "manual" = picked by hand in the form, "saved" = loaded from a saved lot */
export type ItemMatch = Omit<SupplierCodeMatch, "matchedBy"> & {
  matchedBy: MatchSource | "manual" | "saved";
};

export interface LotItemState {
  key: string;
  supplierCode: string;
  description: string;
  boxes: number;
  sqm: number | null;
  amountCny: number;
  weightKg: number | null;
  match: ItemMatch | null;
  rememberAlias: boolean;
}

export interface LotFeeState {
  key: string;
  label: string;
  amountCny: number;
}

export interface LotInvoiceState {
  key: string;
  supplierName: string;
  piNumber: string;
  /** yyyy-mm-dd or "" */
  piDate: string;
  imageUrl: string | null;
  statedTotalCny: number | null;
  fees: LotFeeState[];
  items: LotItemState[];
}

let counter = 0;
export const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

export function emptyItem(partial?: Partial<LotItemState>): LotItemState {
  return {
    key: newKey(),
    supplierCode: "",
    description: "",
    boxes: 0,
    sqm: null,
    amountCny: 0,
    weightKg: null,
    match: null,
    rememberAlias: false,
    ...partial,
  };
}

export function emptyInvoice(partial?: Partial<LotInvoiceState>): LotInvoiceState {
  return {
    key: newKey(),
    supplierName: "",
    piNumber: "",
    piDate: "",
    imageUrl: null,
    statedTotalCny: null,
    fees: [],
    items: [emptyItem()],
    ...partial,
  };
}

export const MATCH_LABELS: Record<ItemMatch["matchedBy"], string> = {
  alias: "จำไว้แล้ว",
  variantSku: "ตรงรหัสสีเว็บ",
  productSku: "ตรง SKU",
  name: "เดาจากชื่อ — ตรวจสอบ",
  manual: "เลือกเอง",
  saved: "จับคู่แล้ว",
};

export function dateToInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
