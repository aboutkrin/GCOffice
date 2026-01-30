import Link from "next/link";
import { Plus } from "lucide-react";

import { getCompanies } from "@/data/companies";
import { Button } from "@/components/ui/button";
import { CompanyTable } from "@/components/companies/company-table";

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">บริษัท</h1>
          <p className="text-muted-foreground text-sm">
            จัดการข้อมูลบริษัททั้งหมด
          </p>
        </div>
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="size-4" />
            เพิ่มบริษัท
          </Link>
        </Button>
      </div>

      <CompanyTable companies={companies} />
    </div>
  );
}
