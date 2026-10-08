import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getHolidayGroupById } from "@/data/holidays";
import { Button } from "@/components/ui/button";
import { HolidayForm } from "@/components/holidays/holiday-form";

interface EditHolidayPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditHolidayPage({ params }: EditHolidayPageProps) {
  const { id } = await params;
  const group = await getHolidayGroupById(id);

  if (!group) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/holidays">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขวันหยุด</h1>
          <p className="text-muted-foreground text-sm">{group.name}</p>
        </div>
      </div>

      <HolidayForm initialData={group} />
    </div>
  );
}
