"use client";

import { useState, useCallback } from "react";

export interface LineItem {
  id: string;
  sequence: number;
  productSku?: string;
  productName: string;
  productImage?: string;
  colorVariantName?: string;
  showImage: boolean;
  details?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export const MAX_LINE_ITEMS = 30;

export function useLineItems(initial: LineItem[] = []) {
  const [items, setItems] = useState<LineItem[]>(initial);

  const addItem = useCallback(() => {
    setItems((prev) => {
      if (prev.length >= MAX_LINE_ITEMS) return prev;
      return [
        ...prev,
        {
          id: generateId(),
          sequence: prev.length + 1,
          productName: "",
          showImage: true,
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sequence: index + 1 }))
    );
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        updated.lineTotal = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  }, []);

  const setFromProduct = useCallback(
    (
      id: string,
      product: {
        sku: string;
        name: string;
        basePrice: number;
        imageUrl?: string;
        colorVariantName?: string;
      }
    ) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            productSku: product.sku,
            productName: product.name,
            productImage: product.imageUrl,
            colorVariantName: product.colorVariantName,
            unitPrice: Number(product.basePrice),
            lineTotal: item.quantity * Number(product.basePrice),
          };
        })
      );
    },
    []
  );

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const canAddItem = items.length < MAX_LINE_ITEMS;

  return { items, setItems, addItem, removeItem, updateItem, setFromProduct, subtotal, canAddItem };
}
