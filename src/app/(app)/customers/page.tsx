import Link from "next/link";
import { Plus } from "lucide-react";

import { getCustomers } from "@/data/customers";
import { Button } from "@/components/ui/button";
import { CustomerTable } from "@/components/customers/customer-table";

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ลูกค้า</h1>
          <p className="text-muted-foreground text-sm">
            จัดการข้อมูลลูกค้าทั้งหมด
          </p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="size-4" />
            เพิ่มลูกค้า
          </Link>
        </Button>
      </div>

      <CustomerTable customers={customers} />
    </div>
  );
}
