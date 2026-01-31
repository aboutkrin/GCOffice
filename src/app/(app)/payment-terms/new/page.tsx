import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaymentTermTemplateForm } from "@/components/payment-term-templates/payment-term-template-form";

export const dynamic = 'force-dynamic';

export default async function NewPaymentTermTemplatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/payment-terms">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มเทมเพลตเงื่อนไขชำระเงิน</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลเทมเพลตด้านล่าง
          </p>
        </div>
      </div>

      <PaymentTermTemplateForm />
    </div>
  );
}
