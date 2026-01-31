import Link from "next/link";
import { Plus } from "lucide-react";

import { getPaymentTermTemplates } from "@/data/payment-term-templates";
import { Button } from "@/components/ui/button";
import { PaymentTermTemplateTable } from "@/components/payment-term-templates/payment-term-template-table";

export const dynamic = 'force-dynamic';

export default async function PaymentTermTemplatesPage() {
  const templates = await getPaymentTermTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">เงื่อนไขชำระเงิน</h1>
          <p className="text-muted-foreground text-sm">
            จัดการเทมเพลตเงื่อนไขการชำระเงิน
          </p>
        </div>
        <Button asChild>
          <Link href="/payment-terms/new">
            <Plus className="size-4" />
            เพิ่มเทมเพลต
          </Link>
        </Button>
      </div>

      <PaymentTermTemplateTable templates={templates} />
    </div>
  );
}
