import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getChinaShipmentsForSelect, getImportLotById } from "@/data/import-lots";
import { Button } from "@/components/ui/button";
import { ImportLotForm } from "@/components/import-lots/import-lot-form";
import { ImportLotDeleteButton } from "@/components/import-lots/import-lot-delete-button";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ImportLotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await getImportLotById(id);
  if (!lot) notFound();
  const shipments = await getChinaShipmentsForSelect(lot.chinaShipmentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/import-lots">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {lot.name}
              {lot.lotNumber && <span className="text-muted-foreground font-normal"> · ล็อต {lot.lotNumber}</span>}
            </h1>
            <p className="text-muted-foreground text-sm">แก้ไขได้ตลอด ต้นทุนเฉลี่ยของสินค้าจะคำนวณใหม่ทันที</p>
          </div>
        </div>
        <ImportLotDeleteButton id={lot.id} name={lot.name} />
      </div>
      <ImportLotForm key={lot.updatedAt as unknown as string} initialData={lot} shipments={shipments} />
    </div>
  );
}
