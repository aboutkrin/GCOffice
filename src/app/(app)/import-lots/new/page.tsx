import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getChinaShipmentsForSelect } from "@/data/import-lots";
import { Button } from "@/components/ui/button";
import { ImportLotForm } from "@/components/import-lots/import-lot-form";

export const dynamic = "force-dynamic";
// Reading a PI image with AI can take a while
export const maxDuration = 60;

export default async function NewImportLotPage() {
  const shipments = await getChinaShipmentsForSelect();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/import-lots">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มล็อตนำเข้า</h1>
          <p className="text-muted-foreground text-sm">
            ใส่ใบ PI จากจีน ระบบคิดต้นทุนถึงไทยต่อกล่อง (รวมค่าส่งจีน-ไทย) ให้อัตโนมัติ
          </p>
        </div>
      </div>
      <ImportLotForm shipments={shipments} />
    </div>
  );
}
