import Link from "next/link";
import { Plus } from "lucide-react";

import { getHolidays } from "@/data/holidays";
import { Button } from "@/components/ui/button";
import { HolidayTable } from "@/components/holidays/holiday-table";

export const dynamic = 'force-dynamic';

export default async function HolidaysPage() {
  const holidays = await getHolidays();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">วันหยุด</h1>
          <p className="text-muted-foreground text-sm">
            จัดการวันหยุดนักขัตฤกษ์สำหรับคำนวณวันจัดส่ง
          </p>
        </div>
        <Button asChild>
          <Link href="/holidays/new">
            <Plus className="size-4" />
            เพิ่มวันหยุด
          </Link>
        </Button>
      </div>

      <HolidayTable holidays={holidays} />
    </div>
  );
}
