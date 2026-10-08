import { test } from "node:test";
import assert from "node:assert/strict";
import { allocate, computeLandedCosts, normalizeCode } from "../src/lib/landed-cost";

test("allocate keeps the exact total", () => {
  const parts = allocate(100000, [1, 1, 1]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 100000);
  assert.deepEqual(allocate(1000, [0, 0]), [500, 500]);
});

test("10 boxes, 1,000 THB freight: 100 THB per box whoever buys them", () => {
  const r = computeLandedCosts({
    exchangeRate: 5,
    ratePerKg: 10,
    freightOverride: 1000,
    invoices: [{ fees: [], items: [{ boxes: 10, amountCny: 1000, weightKg: 200 }] }],
  });
  // (1000 CNY × 5) + 1000 THB = 6000 → 600/box, of which 100 is freight
  assert.equal(r.invoices[0].items[0].landedPerBox, 600);
  assert.equal(r.totalLanded, 6000);
});

test("TILEND PI: fees split by weight, freight from weight × rate, totals reconcile", () => {
  const items = [
    { boxes: 12, amountCny: 630, weightKg: 122.4 },
    { boxes: 12, amountCny: 600, weightKg: 122.4 },
    { boxes: 10, amountCny: 780, weightKg: 190 },
    { boxes: 6, amountCny: 648, weightKg: 114 },
    { boxes: 9, amountCny: 972, weightKg: 171 },
    { boxes: 2, amountCny: 309, weightKg: 46 },
    { boxes: 5, amountCny: 690, weightKg: 102.5 },
    { boxes: 1, amountCny: 138, weightKg: 20.5 },
    { boxes: 15, amountCny: 1470, weightKg: 277.5 },
    { boxes: 4, amountCny: 472, weightKg: 76 },
    { boxes: 25, amountCny: 2950, weightKg: 475 },
    { boxes: 4, amountCny: 260, weightKg: 74 },
    { boxes: 3, amountCny: 285.6, weightKg: 49.5 },
  ];
  const r = computeLandedCosts({
    exchangeRate: 5.0061,
    ratePerKg: 10,
    invoices: [{ fees: [{ label: "Freight", amountCny: 350 }], items }],
  });
  assert.equal(r.totalGoodsCny + r.totalFeesCny, 10554.6);
  assert.equal(r.totalWeightKg, 1840.8);
  assert.equal(r.freight, 18408);
  const sum = r.invoices[0].items.reduce((s, it) => s + Math.round(it.landedTotal * 100), 0);
  assert.equal(sum, Math.round(r.totalLanded * 100));
  const feeSum = r.invoices[0].items.reduce((s, it) => s + Math.round(it.feeShareCny * 100), 0);
  assert.equal(feeSum, 35000);
  assert.equal(r.missingWeight, false);
});

test("missing weight falls back to amount split", () => {
  const r = computeLandedCosts({
    exchangeRate: 1,
    ratePerKg: 10,
    freightOverride: 300,
    invoices: [{ fees: [], items: [{ boxes: 1, amountCny: 100 }, { boxes: 1, amountCny: 200 }] }],
  });
  assert.equal(r.missingWeight, true);
  assert.deepEqual(r.invoices[0].items.map((i) => i.freightShare), [100, 200]);
});

test("normalizeCode", () => {
  assert.equal(normalizeCode(" ysp125-q304 "), "YSP125Q304");
});
