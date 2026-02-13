import { getCompanies } from "@/data/companies";
import { searchCustomers } from "@/data/customers";
import { PrintOrderForm } from "@/components/print-order/print-order-form";

export const dynamic = "force-dynamic";

export default async function PrintOrderPage() {
  const [companies, customers] = await Promise.all([
    getCompanies(),
    searchCustomers(""),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">พิมพ์ใบสั่งของ</h1>
        <p className="text-muted-foreground text-sm">
          เลือกบริษัทและลูกค้าเพื่อพิมพ์ใบสั่งของ
        </p>
      </div>

      <PrintOrderForm companies={companies} customers={customers} />
    </div>
  );
}
