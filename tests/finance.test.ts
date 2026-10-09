import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addTotals,
  EMPTY_TOTALS,
  outstandingAmount,
  percentChange,
  shiftMonth,
  summarizeFinance,
} from "../src/lib/finance";

test("summarizeFinance: gross = revenue − product costs, net = gross − expenses", () => {
  const s = summarizeFinance({
    revenue: 156320,
    vat: 10942.4,
    cogs: 24180,
    deliveryCost: 3500,
    legacyVendorCost: 0,
    operatingExpense: 20111.46,
  });
  assert.equal(s.productCost, 27680);
  assert.equal(s.grossProfit, 128640);
  assert.equal(s.netProfit, 108528.54);
  assert.equal(s.marginPercent, 69.43);
  assert.equal(s.grossMarginPercent, 82.29);
});

test("summarizeFinance: legacy vendor costs are product cost; no revenue → 0% margin", () => {
  const s = summarizeFinance({ ...EMPTY_TOTALS, legacyVendorCost: 1000, operatingExpense: 500 });
  assert.equal(s.productCost, 1000);
  assert.equal(s.grossProfit, -1000);
  assert.equal(s.netProfit, -1500);
  assert.equal(s.marginPercent, 0);
});

test("addTotals rounds to satang", () => {
  const t = addTotals({ ...EMPTY_TOTALS, revenue: 0.1 }, { ...EMPTY_TOTALS, revenue: 0.2 });
  assert.equal(t.revenue, 0.3);
});

test("percentChange", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, -100), 150);
  assert.equal(percentChange(10, 0), null);
});

test("outstandingAmount never goes below zero", () => {
  assert.equal(outstandingAmount(1070, [500]), 570);
  assert.equal(outstandingAmount(1070, [500, 570]), 0);
  assert.equal(outstandingAmount(1000, [1200]), 0);
});

test("shiftMonth crosses years", () => {
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
});
