"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Globe } from "lucide-react";

import { WEBSITE_INACTIVE_LABEL } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";

export interface ColorVariantItem {
  id?: string;
  name: string;
  colorHex?: string;
  imageUrl?: string;
  price?: number | null;
  sortOrder: number;
  /** Set when the colour is synced from goodchoiceth.com; name/hex/image are then read-only. */
  websiteVariantId?: number | null;
  /** false = the website stopped selling this colour (still usable in documents). */
  websiteActive?: boolean;
}

function isWebsiteOwned(variant: ColorVariantItem): boolean {
  return variant.websiteVariantId != null;
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
      price: null,
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
            {variants.map((variant, index) => {
              const locked = isWebsiteOwned(variant);
              return (
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
                  <span className="text-sm font-medium flex-1 flex items-center gap-2 flex-wrap">
                    {variant.name || "(ยังไม่ได้ตั้งชื่อ)"}
                    {variant.price != null && variant.price > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ฿{variant.price.toLocaleString()}
                      </span>
                    )}
                    {locked && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 gap-1"
                        title="สีนี้ซิงค์จากเว็บไซต์ แก้ไขชื่อ/สี/รูปได้ที่ goodchoiceth.com"
                      >
                        <Globe className="size-3" />
                        เว็บ
                      </Badge>
                    )}
                    {variant.websiteActive === false && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {WEBSITE_INACTIVE_LABEL}
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    #{index + 1}
                  </span>
                  {locked ? (
                    // Website-owned colours are removed on the website, never here
                    <span className="size-6 inline-block" aria-hidden />
                  ) : (
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
                  )}
                </div>

                {/* Expanded detail */}
                {expandedIndex === index && (
                  <div className="border-t p-3 space-y-3">
                    {locked && (
                      <p className="text-xs text-muted-foreground">
                        ชื่อสี รหัสสี และรูปภาพจัดการบนเว็บไซต์ — แก้ไขได้เฉพาะราคาเฉพาะสี
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="mb-1.5 block text-xs">ชื่อสี</Label>
                        <Input
                          placeholder="เช่น แดง, น้ำเงิน, ขาว"
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(index, { name: e.target.value })
                          }
                          disabled={locked}
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
                            disabled={locked}
                          />
                          <Input
                            placeholder="#FF0000"
                            value={variant.colorHex ?? ""}
                            onChange={(e) =>
                              updateVariant(index, { colorHex: e.target.value })
                            }
                            className="flex-1"
                            disabled={locked}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs">ราคา (บาท)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="ราคาเฉพาะสีนี้ (ว่าง = ใช้ราคาตั้งต้น)"
                          value={variant.price ?? ""}
                          onChange={(e) =>
                            updateVariant(index, {
                              price: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
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
                        disabled={locked}
                      />
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
