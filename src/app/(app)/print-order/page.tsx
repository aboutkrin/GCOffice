import { searchCustomers } from "@/data/customers";
import { PrintOrderForm } from "@/components/print-order/print-order-form";

export const dynamic = "force-dynamic";

export default async function PrintOrderPage() {
  const customers = await searchCustomers("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">พิมพ์ใบส่งของ</h1>
        <p className="text-muted-foreground text-sm">
          กรอกข้อมูลร้านและเลือกลูกค้าเพื่อพิมพ์ใบส่งของ
        </p>
      </div>

      <PrintOrderForm customers={customers} />
    </div>
  );
}
