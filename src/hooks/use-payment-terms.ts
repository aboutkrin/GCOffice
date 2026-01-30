"use client";

import { useState, useCallback } from "react";

export interface PaymentTerm {
  id: string;
  sequence: number;
  name: string;
  type: "PERCENTAGE" | "AMOUNT";
  value: number;
  calculatedAmount: number;
  note?: string;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function usePaymentTerms(initial: PaymentTerm[] = []) {
  const [terms, setTerms] = useState<PaymentTerm[]>(initial);

  const addTerm = useCallback(() => {
    setTerms((prev) => [
      ...prev,
      {
        id: generateId(),
        sequence: prev.length + 1,
        name: "",
        type: "PERCENTAGE" as const,
        value: 0,
        calculatedAmount: 0,
      },
    ]);
  }, []);

  const removeTerm = useCallback((id: string) => {
    setTerms((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t, i) => ({ ...t, sequence: i + 1 }))
    );
  }, []);

  const updateTerm = useCallback(
    (id: string, updates: Partial<PaymentTerm>) => {
      setTerms((prev) =>
        prev.map((t) => (t.id !== id ? t : { ...t, ...updates }))
      );
    },
    []
  );

  const recalculate = useCallback((grandTotal: number) => {
    setTerms((prev) =>
      prev.map((term) => ({
        ...term,
        calculatedAmount:
          term.type === "PERCENTAGE"
            ? grandTotal * (term.value / 100)
            : term.value,
      }))
    );
  }, []);

  const totalAmount = terms.reduce((sum, t) => sum + t.calculatedAmount, 0);

  return { terms, setTerms, addTerm, removeTerm, updateTerm, recalculate, totalAmount };
}
