import { test } from "node:test";
import assert from "node:assert/strict";

import { blendLotCost, resolveLineCost, type LandedCostIndex } from "../src/lib/line-cost";

const index: LandedCostIndex = {
  byVariant: { v1: 120 },
  byProduct: { p1: 100, p2: 90 },
  legacy: { p1: 80, p3: 70 },
};

test("manual cost wins over everything", () => {
  assert.deepEqual(
    resolveLineCost({ unitCost: "150", costSnapshot: 110, productId: "p1", colorVariantId: "v1" }, index),
    { unitCost: 150, source: "manual" }
  );
});

test("cost locked at confirmation wins over today's lot average", () => {
  assert.deepEqual(resolveLineCost({ unitCost: null, costSnapshot: "110.50", productId: "p1", colorVariantId: "v1" }, index), {
    unitCost: 110.5,
    source: "snapshot",
  });
});

test("falls back variant → product → legacy → none", () => {
  assert.deepEqual(resolveLineCost({ productId: "p1", colorVariantId: "v1" }, index), { unitCost: 120, source: "variant" });
  assert.deepEqual(resolveLineCost({ productId: "p2", colorVariantId: "vX" }, index), { unitCost: 90, source: "product" });
  assert.deepEqual(resolveLineCost({ productId: "p3" }, index), { unitCost: 70, source: "legacy" });
  assert.deepEqual(resolveLineCost({ productId: "p4" }, index), { unitCost: null, source: "none" });
});

test("a zero snapshot is a real locked cost", () => {
  assert.deepEqual(resolveLineCost({ costSnapshot: 0, productId: "p1" }, index), { unitCost: 0, source: "snapshot" });
});

test("blends the cost of boxes from several lots", () => {
  assert.equal(blendLotCost([{ boxes: 5, landedPerBox: 600 }, { boxes: 1, landedPerBox: 540 }]), 590);
  assert.equal(blendLotCost([{ boxes: 3, landedPerBox: 100.1 }]), 100.1);
  assert.equal(blendLotCost([{ boxes: 2, landedPerBox: 100 }, { boxes: 1, landedPerBox: 101 }]), 100.33);
});

test("blendLotCost rejects empty or non-positive box counts", () => {
  assert.equal(blendLotCost([]), null);
  assert.equal(blendLotCost([{ boxes: 0, landedPerBox: 100 }]), null);
  assert.equal(blendLotCost([{ boxes: 2, landedPerBox: 100 }, { boxes: -1, landedPerBox: 50 }]), null);
});
