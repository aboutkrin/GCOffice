import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getStockDocuments } from "@/data/stock-documents";
import { Button } from "@/components/ui/button";
import { StockDocumentTable } from "@/components/stock/stock-document-table";
import { NewStockDocumentButton } from "@/components/stock/new-stock-document-button";

export const dynamic = "force-dynamic";

interface CountPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CountPage({ searchParams }: CountPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { documents, total } = await getStockDocuments({
    type: "COUNT",
    search: params.search,
    page,
    perPage: 20,
  });
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/stock">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ตรวจนับสต็อค</h1>
            <p className="text-muted-foreground text-sm">
              กด &quot;ตรวจนับใหม่&quot; → สแกน QR แล้วใส่จำนวนที่นับได้ → กด &quot;บันทึกและปรับสต็อค&quot; ระบบจะตั้งสต็อคเป็นจำนวนที่นับได้
            </p>
          </div>
        </div>
        <NewStockDocumentButton type="COUNT" label="ตรวจนับใหม่" basePath="count" />
      </div>

      <StockDocumentTable
        documents={documents}
        total={total}
        page={page}
        totalPages={totalPages}
        basePath="count"
        search={params.search ?? ""}
      />
    </div>
  );
}
