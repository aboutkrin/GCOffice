import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  CreditCard,
  FileText,
  Package,
  Truck,
  Receipt,
  Printer,
} from "lucide-react";

import { getVendorCostById } from "@/data/vendor-costs";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { PAYMENT_METHOD_LABELS, SHIPPING_PROVIDER_LABELS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { VendorCostDeleteButton } from "@/components/vendor-costs/vendor-cost-delete-button";

interface VendorCostDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function VendorCostDetailPage({
  params,
}: VendorCostDetailPageProps) {
  const { id } = await params;
  const vendorCost = await getVendorCostById(id);

  if (!vendorCost) {
    notFound();
  }

  const itemsTotal = (vendorCost.items ?? []).reduce(
    (sum, item) => sum + Number(item.lineTotal),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vendor-costs">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">รายละเอียดต้นทุนใบสั่งซื้อ</h1>
            <p className="text-muted-foreground text-sm">
              {vendorCost.vendorName}
              {vendorCost.orderNumber
                ? ` - PO: ${vendorCost.orderNumber}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/vendor-costs/${id}/print`}>
              <Printer className="size-4" />
              พิมพ์
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/vendor-costs/${id}/edit`}>
              <Pencil className="size-4" />
              แก้ไข
            </Link>
          </Button>
          <VendorCostDeleteButton
            id={id}
            vendorName={vendorCost.vendorName}
          />
        </div>
      </div>

      {/* Total Cost Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            สรุปต้นทุน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-6 text-center">
            <div className="text-sm text-muted-foreground mb-1">
              ยอดต้นทุนรวม
            </div>
            <div className="text-3xl font-bold text-green-600">
              {formatBaht(Number(vendorCost.totalCost))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground">ค่าสินค้า</div>
              <div className="font-medium text-lg">{formatBaht(itemsTotal)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground">ค่าขนส่ง</div>
              <div className="font-medium text-lg">
                {formatBaht(Number(vendorCost.shippingCost))}
              </div>
            </div>
            {Number(vendorCost.otherCost) > 0 && (
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">ค่าใช้จ่ายอื่น</div>
                <div className="font-medium text-lg">
                  {formatBaht(Number(vendorCost.otherCost))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            ข้อมูลใบสั่งซื้อ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="size-4" />
                Vendor
              </div>
              <div className="font-medium">{vendorCost.vendorName}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                วันที่สั่งซื้อ
              </div>
              <div className="font-medium">
                {formatThaiDate(new Date(vendorCost.orderDate), "long")}
              </div>
            </div>

            {vendorCost.orderNumber && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4" />
                  เลขที่ PO
                </div>
                <div className="font-medium">{vendorCost.orderNumber}</div>
              </div>
            )}

            {vendorCost.exchangeRate && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  อัตราแลกเปลี่ยน (CNY)
                </div>
                <div className="font-medium">
                  1 CNY = {Number(vendorCost.exchangeRate).toFixed(2)} THB
                </div>
              </div>
            )}

            {vendorCost.document && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="size-4" />
                  เลขที่บิล
                </div>
                <div>
                  <div className="font-medium">
                    {vendorCost.document.documentNumber}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vendorCost.document.customer?.companyName ||
                      vendorCost.document.customer?.customerName}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Payment Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="size-4" />
                วิธีชำระค่าสินค้า
              </div>
              <div>
                <Badge variant="outline">
                  {PAYMENT_METHOD_LABELS[vendorCost.paymentMethod] ?? "-"}
                </Badge>
                {vendorCost.paymentMethodNote && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {vendorCost.paymentMethodNote}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="size-4" />
                การขนส่ง / วิธีชำระค่าส่ง
              </div>
              <div>
                <Badge variant="secondary" className="mr-2">
                  {SHIPPING_PROVIDER_LABELS[vendorCost.shippingProvider] ??
                    vendorCost.shippingProvider}
                </Badge>
                <Badge variant="outline">
                  {PAYMENT_METHOD_LABELS[vendorCost.shippingPaymentMethod] ??
                    "-"}
                </Badge>
                {vendorCost.shippingPaymentMethodNote && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {vendorCost.shippingPaymentMethodNote}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      {vendorCost.items && vendorCost.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              รายการสินค้า ({vendorCost.items.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    {vendorCost.exchangeRate && (
                      <TableHead className="text-right hidden sm:table-cell">
                        ราคา (CNY)
                      </TableHead>
                    )}
                    <TableHead className="text-right">ราคา/หน่วย</TableHead>
                    <TableHead className="text-right">รวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {vendorCost.items.map((item: any, index: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.productName}</div>
                        {item.productSku && (
                          <div className="text-xs text-muted-foreground">
                            SKU: {item.productSku}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      {vendorCost.exchangeRate && (
                        <TableCell className="text-right hidden sm:table-cell">
                          {item.unitCostCny
                            ? `¥${Number(item.unitCostCny).toFixed(2)}`
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {formatBaht(Number(item.unitCost))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatBaht(Number(item.lineTotal))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell
                      colSpan={vendorCost.exchangeRate ? 5 : 4}
                      className="text-right font-medium"
                    >
                      รวมค่าสินค้า
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatBaht(itemsTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {vendorCost.notes && (
        <Card>
          <CardHeader>
            <CardTitle>หมายเหตุ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm rounded-lg bg-muted/50 p-4">
              {vendorCost.notes}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
