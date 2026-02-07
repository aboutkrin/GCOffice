import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getInvoicesForSelect } from "@/data/vendor-costs";
import { Button } from "@/components/ui/button";
import { VendorCostForm } from "@/components/vendor-costs/vendor-cost-form";

export const dynamic = "force-dynamic";

export default async function NewVendorCostPage() {
  const invoices = await getInvoicesForSelect();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vendor-costs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มต้นทุนใบสั่งซื้อ</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลต้นทุนสินค้าจาก Vendor
          </p>
        </div>
      </div>

      <VendorCostForm invoices={invoices} />
    </div>
  );
}
