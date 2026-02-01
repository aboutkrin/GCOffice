"use client";

import { useMemo } from "react";

interface PricingInput {
  subtotal: number;
  discountType?: "PERCENTAGE" | "AMOUNT" | null;
  discountValue?: number;
  vatEnabled: boolean;
  vatRate: number;
  shippingCost?: number;
}

export function usePricing(input: PricingInput) {
  return useMemo(() => {
    const {
      subtotal,
      discountType,
      discountValue = 0,
      vatEnabled,
      vatRate,
      shippingCost = 0,
    } = input;

    let discountAmount = 0;
    if (discountType === "PERCENTAGE") {
      discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === "AMOUNT") {
      discountAmount = discountValue;
    }

    const afterDiscount = subtotal - discountAmount;
    const vatAmount = vatEnabled ? afterDiscount * (vatRate / 100) : 0;
    const grandTotal = afterDiscount + vatAmount + shippingCost;

    return { discountAmount, afterDiscount, vatAmount, grandTotal };
  }, [
    input.subtotal,
    input.discountType,
    input.discountValue,
    input.vatEnabled,
    input.vatRate,
    input.shippingCost,
  ]);
}
