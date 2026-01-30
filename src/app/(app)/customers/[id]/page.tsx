import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCustomerById } from "@/data/customers";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";

interface EditCustomerPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขลูกค้า</h1>
          <p className="text-muted-foreground text-sm">
            {customer.customerName}
          </p>
        </div>
      </div>

      <CustomerForm initialData={customer} />
    </div>
  );
}
