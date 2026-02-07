import Link from "next/link";
import { Plus } from "lucide-react";

import { getVendorCosts } from "@/data/vendor-costs";
import { getThaiNow } from "@/lib/thai-date";
import { Button } from "@/components/ui/button";
import { VendorCostTable } from "@/components/vendor-costs/vendor-cost-table";

export const dynamic = "force-dynamic";

interface VendorCostsPageProps {
  searchParams: Promise<{
    search?: string;
    month?: string;
    year?: string;
  }>;
}

export default async function VendorCostsPage({
  searchParams,
}: VendorCostsPageProps) {
  const params = await searchParams;
  const thaiNow = getThaiNow();
  const currentYear = params.year ? parseInt(params.year, 10) : thaiNow.year;
  const currentMonth =
    params.month === "all"
      ? undefined
      : params.month
        ? parseInt(params.month, 10)
        : thaiNow.month;

  const vendorCosts = await getVendorCosts({
    search: params.search,
    month: currentMonth,
    year: currentYear,
  });

  const totalCost = vendorCosts.reduce(
    (sum: number, vc: any) => sum + Number(vc.totalCost),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ต้นทุนใบสั่งซื้อ</h1>
          <p className="text-muted-foreground text-sm">
            จัดการต้นทุนใบสั่งซื้อสินค้าจาก Vendor ทั้งหมด
          </p>
        </div>
        <Button asChild>
          <Link href="/vendor-costs/new">
            <Plus className="size-4" />
            เพิ่มต้นทุนใบสั่งซื้อ
          </Link>
        </Button>
      </div>

      <VendorCostTable
        vendorCosts={vendorCosts}
        totalCost={totalCost}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </div>
  );
}
