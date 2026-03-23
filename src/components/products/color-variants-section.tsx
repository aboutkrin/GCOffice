"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";

export interface ColorVariantItem {
  id?: string;
  name: string;
  colorHex?: string;
  imageUrl?: string;
  sortOrder: number;
}

interface ColorVariantsSectionProps {
  variants: ColorVariantItem[];
  onChange: (variants: ColorVariantItem[]) => void;
}

export function ColorVariantsSection({
  variants,
  onChange,
}: ColorVariantsSectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function addVariant() {
    const newVariant: ColorVariantItem = {
      name: "",
      colorHex: "",
      imageUrl: "",
      sortOrder: variants.length,
    };
    const updated = [...variants, newVariant];
    onChange(updated);
    setExpandedIndex(updated.length - 1);
  }

  function removeVariant(index: number) {
    const updated = variants.filter((_, i) => i !== index);
    // Re-order
    const reordered = updated.map((v, i) => ({ ...v, sortOrder: i }));
    onChange(reordered);
    if (expandedIndex === index) setExpandedIndex(null);
    else if (expandedIndex !== null && expandedIndex > index)
      setExpandedIndex(expandedIndex - 1);
  }

  function updateVariant(index: number, updates: Partial<ColorVariantItem>) {
    const updated = variants.map((v, i) =>
      i === index ? { ...v, ...updates } : v
    );
    onChange(updated);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>สีสินค้า</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
          <Plus className="size-4" />
          เพิ่มสี
        </Button>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            ยังไม่มีสีสินค้า — คลิก &quot;เพิ่มสี&quot; เพื่อเพิ่มสีให้กับสินค้านี้
          </p>
        ) : (
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div
                key={variant.id ?? `new-${index}`}
                className="border rounded-lg"
              >
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() =>
                    setExpandedIndex(expandedIndex === index ? null : index)
                  }
                >
                  <GripVertical className="size-4 text-muted-foreground shrink-0" />
                  {variant.colorHex ? (
                    <div
                      className="size-6 rounded-full border shrink-0"
                      style={{ backgroundColor: variant.colorHex }}
                    />
                  ) : (
                    <div className="size-6 rounded-full border bg-muted shrink-0" />
                  )}
                  <span className="text-sm font-medium flex-1">
                    {variant.name || "(ยังไม่ได้ตั้งชื่อ)"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeVariant(index);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Expanded detail */}
                {expandedIndex === index && (
                  <div className="border-t p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-1.5 block text-xs">ชื่อสี</Label>
                        <Input
                          placeholder="เช่น แดง, น้ำเงิน, ขาว"
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(index, { name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs">
                          รหัสสี (Hex)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={variant.colorHex || "#cccccc"}
                            onChange={(e) =>
                              updateVariant(index, { colorHex: e.target.value })
                            }
                            className="w-12 p-1 h-9"
                          />
                          <Input
                            placeholder="#FF0000"
                            value={variant.colorHex ?? ""}
                            onChange={(e) =>
                              updateVariant(index, { colorHex: e.target.value })
                            }
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">รูปภาพสี</Label>
                      <ImageUpload
                        value={variant.imageUrl ?? ""}
                        onChange={(url) =>
                          updateVariant(index, { imageUrl: url })
                        }
                        bucket="product-images"
                        folder="product-variants"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
