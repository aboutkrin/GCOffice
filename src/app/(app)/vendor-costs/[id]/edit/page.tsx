import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getVendorCostById, getInvoicesForSelect } from "@/data/vendor-costs";
import { Button } from "@/components/ui/button";
import { VendorCostForm } from "@/components/vendor-costs/vendor-cost-form";

interface EditVendorCostPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditVendorCostPage({
  params,
}: EditVendorCostPageProps) {
  const { id } = await params;
  const vendorCost = await getVendorCostById(id);

  if (!vendorCost) {
    notFound();
  }

  const invoices = await getInvoicesForSelect(vendorCost.documentId ?? undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/vendor-costs/${id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขต้นทุนใบสั่งซื้อ</h1>
          <p className="text-muted-foreground text-sm">
            {vendorCost.vendorName}
            {vendorCost.orderNumber ? ` - PO: ${vendorCost.orderNumber}` : ""}
          </p>
        </div>
      </div>

      <VendorCostForm initialData={vendorCost} invoices={invoices} />
    </div>
  );
}
