import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มลูกค้าใหม่</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลลูกค้าด้านล่าง
          </p>
        </div>
      </div>

      <CustomerForm />
    </div>
  );
}
