import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getLabelItems } from "@/data/stock-documents";
import { Button } from "@/components/ui/button";
import { QrLabelPicker } from "@/components/stock/qr-label-picker";

export const dynamic = "force-dynamic";

export default async function StockLabelsPage() {
  const products = await getLabelItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/stock">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">พิมพ์ QR สินค้า</h1>
          <p className="text-muted-foreground text-sm">
            เลือกสินค้า/สี แล้วพิมพ์เป็นแผ่น QR ขนาด 12 ดวงต่อ A4 สำหรับติดกล่องสินค้า
          </p>
        </div>
      </div>

      <QrLabelPicker products={products} />
    </div>
  );
}
