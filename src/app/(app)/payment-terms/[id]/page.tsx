import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getPaymentTermTemplateById } from "@/data/payment-term-templates";
import { Button } from "@/components/ui/button";
import { PaymentTermTemplateForm } from "@/components/payment-term-templates/payment-term-template-form";

interface EditPaymentTermTemplatePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditPaymentTermTemplatePage({
  params,
}: EditPaymentTermTemplatePageProps) {
  const { id } = await params;
  const template = await getPaymentTermTemplateById(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/payment-terms">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขเทมเพลตเงื่อนไขชำระเงิน</h1>
          <p className="text-muted-foreground text-sm">{template.name}</p>
        </div>
      </div>

      <PaymentTermTemplateForm initialData={template} />
    </div>
  );
}
