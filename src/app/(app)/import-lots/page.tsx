import Link from "next/link";
import { AlertTriangle, Plus, Search, Ship, Truck } from "lucide-react";

import { getImportLots } from "@/data/import-lots";
import { formatBaht, formatNumber } from "@/lib/thai-currency";
import { formatThaiDateShort } from "@/lib/thai-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ImportLotsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const lots = await getImportLots({ search });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ล็อตนำเข้า (ใบ PI จีน)</h1>
          <p className="text-muted-foreground text-sm">
            ต้นทุนถึงไทยต่อกล่อง = ราคาสินค้า + ค่าใช้จ่ายฝั่งจีน + ค่าส่งจีน-ไทย (เฉลี่ยตามน้ำหนัก)
            ใช้คิดกำไรในใบเสนอราคา/ใบแจ้งหนี้อัตโนมัติ
          </p>
        </div>
        <Button asChild>
          <Link href="/import-lots/new">
            <Plus className="size-4" />
            เพิ่มล็อตนำเข้า
          </Link>
        </Button>
      </div>

      <form className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input name="search" defaultValue={search} placeholder="ค้นหาเลข Tracking เลขล็อต ร้าน เลข PI หรือรหัสสินค้า" className="pl-9" />
      </form>

      {lots.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            ยังไม่มีล็อตนำเข้า กด &ldquo;เพิ่มล็อตนำเข้า&rdquo; แล้วถ่ายรูปใบ PI ได้เลย
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่สั่ง</TableHead>
                <TableHead>Tracking / ล็อต</TableHead>
                <TableHead>ร้าน / เลข PI</TableHead>
                <TableHead className="text-right">กล่อง</TableHead>
                <TableHead className="text-right">น้ำหนัก (กก.)</TableHead>
                <TableHead className="text-right">ต้นทุนถึงไทย</TableHead>
                <TableHead>สถานะจับคู่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id} className="relative">
                  <TableCell className="whitespace-nowrap">
                    {formatThaiDateShort(new Date(lot.orderDate))}
                  </TableCell>
                  <TableCell>
                    <Link href={`/import-lots/${lot.id}`} className="font-medium after:absolute after:inset-0">
                      {lot.name}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {lot.lotNumber ? `ล็อต ${lot.lotNumber}` : "ยังไม่มีเลขล็อต"}
                    </p>
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      {lot.transportMode === "TRUCK" ? <Truck className="size-3" /> : <Ship className="size-3" />}
                      {lot.transportMode === "TRUCK" ? "รถ" : "เรือ"}
                      {lot.chinaShipment && <span>· {lot.chinaShipment.title}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <p className="truncate">{lot.suppliers.join(", ")}</p>
                    <p className="text-muted-foreground truncate text-xs">{lot.piNumbers.join(", ")}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{lot.totalBoxes.toLocaleString("th-TH")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(Number(lot.totalWeightKg))}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatBaht(Number(lot.totalLanded))}
                  </TableCell>
                  <TableCell>
                    {lot.unmatchedCount > 0 ? (
                      <Badge variant="outline" className="border-amber-400 text-amber-700">
                        <AlertTriangle className="size-3" />
                        ยังไม่จับคู่ {lot.unmatchedCount}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-400 text-emerald-700">
                        ครบ {lot.itemCount} รายการ
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
