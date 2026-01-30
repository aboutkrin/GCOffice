import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCompanyById } from "@/data/companies";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/companies/company-form";

interface EditCompanyPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { id } = await params;
  const company = await getCompanyById(id);

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/companies">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขบริษัท</h1>
          <p className="text-muted-foreground text-sm">{company.name}</p>
        </div>
      </div>

      <CompanyForm initialData={company} />
    </div>
  );
}
