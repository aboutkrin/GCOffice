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

    // Include shipping in subtotal before discount
    const subtotalWithShipping = subtotal + shippingCost;

    let discountAmount = 0;
    if (discountType === "PERCENTAGE") {
      discountAmount = subtotalWithShipping * (discountValue / 100);
    } else if (discountType === "AMOUNT") {
      discountAmount = discountValue;
    }

    const afterDiscount = subtotalWithShipping - discountAmount;
    // VAT is calculated on afterDiscount (which includes shipping)
    const vatAmount = vatEnabled ? afterDiscount * (vatRate / 100) : 0;
    const grandTotal = afterDiscount + vatAmount;

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
