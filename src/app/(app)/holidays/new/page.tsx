import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HolidayForm } from "@/components/holidays/holiday-form";

export default function NewHolidayPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/holidays">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มวันหยุดใหม่</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลวันหยุดด้านล่าง
          </p>
        </div>
      </div>

      <HolidayForm />
    </div>
  );
}
