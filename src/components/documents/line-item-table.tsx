"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { ProductPicker } from "./product-picker";
import { formatNumber } from "@/lib/thai-currency";
import { type LineItem, MAX_LINE_ITEMS } from "@/hooks/use-line-items";

interface LineItemTableProps {
  items: LineItem[];
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<LineItem>) => void;
  setFromProduct: (
    id: string,
    product: {
      sku: string;
      name: string;
      basePrice: number;
      imageUrl?: string;
    }
  ) => void;
}

export function LineItemTable({
  items,
  addItem,
  removeItem,
  updateItem,
  setFromProduct,
}: LineItemTableProps) {
  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead className="min-w-[200px]">สินค้า</TableHead>
              <TableHead className="min-w-[150px]">รายละเอียด</TableHead>
              <TableHead className="w-[90px] text-center">จำนวน</TableHead>
              <TableHead className="w-[120px] text-right">ราคาต่อหน่วย</TableHead>
              <TableHead className="w-[120px] text-right">รวม</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  ยังไม่มีรายการสินค้า กดปุ่ม &quot;เพิ่มรายการ&quot;
                  เพื่อเริ่มต้น
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id} className="align-middle">
                <TableCell className="text-center font-medium">
                  {item.sequence}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.productImage && (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        width={40}
                        height={40}
                        className="rounded border object-cover shrink-0"
                      />
                    )}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Input
                        value={item.productName}
                        onChange={(e) =>
                          updateItem(item.id, { productName: e.target.value })
                        }
                        placeholder="ชื่อสินค้า"
                        className="h-9"
                      />
                      <ProductPicker
                        onSelect={(product) => setFromProduct(item.id, product)}
                      />
                    </div>
                  </div>
                  {(item.productSku || item.colorVariantName) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.productSku && <>SKU: {item.productSku}</>}
                      {item.productSku && item.colorVariantName && " — "}
                      {item.colorVariantName && <>สี: {item.colorVariantName}</>}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    value={item.details || ""}
                    onChange={(e) =>
                      updateItem(item.id, { details: e.target.value })
                    }
                    placeholder="รายละเอียดเพิ่มเติม"
                    className="h-9 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity || ""}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    onBlur={() => {
                      if (!item.quantity) updateItem(item.id, { quantity: 1 });
                    }}
                    className="h-9 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(item.id, {
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-9 text-right"
                  />
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">
                  {formatNumber(item.lineTotal)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {items.length === 0 && (
          <div className="text-center text-muted-foreground py-8 border rounded-lg">
            ยังไม่มีรายการสินค้า กดปุ่ม &quot;เพิ่มรายการ&quot; เพื่อเริ่มต้น
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                รายการที่ {item.sequence}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={item.productName}
                  onChange={(e) =>
                    updateItem(item.id, { productName: e.target.value })
                  }
                  placeholder="ชื่อสินค้า"
                  className="h-9"
                />
                <ProductPicker
                  onSelect={(product) => setFromProduct(item.id, product)}
                />
              </div>
              {(item.productSku || item.colorVariantName) && (
                <p className="text-xs text-muted-foreground">
                  {item.productSku && <>SKU: {item.productSku}</>}
                  {item.productSku && item.colorVariantName && " — "}
                  {item.colorVariantName && <>สี: {item.colorVariantName}</>}
                </p>
              )}
              {item.productImage && (
                <div className="mt-2">
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    width={80}
                    height={80}
                    className="rounded border object-cover"
                  />
                </div>
              )}
            </div>

            <Textarea
              value={item.details || ""}
              onChange={(e) =>
                updateItem(item.id, { details: e.target.value })
              }
              placeholder="รายละเอียดเพิ่มเติม"
              rows={2}
              className="text-sm"
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">จำนวน</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity || ""}
                  onChange={(e) =>
                    updateItem(item.id, {
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  onBlur={() => {
                    if (!item.quantity) updateItem(item.id, { quantity: 1 });
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  ราคาต่อหน่วย
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice || ""}
                  onChange={(e) =>
                    updateItem(item.id, {
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t">
              <span className="font-semibold">
                {formatNumber(item.lineTotal)} บาท
              </span>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addItem} disabled={items.length >= MAX_LINE_ITEMS} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        เพิ่มรายการ ({items.length}/{MAX_LINE_ITEMS})
      </Button>
    </div>
  );
}
