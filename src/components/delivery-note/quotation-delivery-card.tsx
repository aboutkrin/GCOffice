"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createIssueFromDocument } from "@/actions/stock-document-actions";
import { formatThaiDate } from "@/lib/thai-date";

interface QuotationDeliveryCardProps {
  documentId: string;
  /** Per quotation line: ordered / issued / remaining (getDocumentIssueProgress). */
  progress: {
    id: string;
    productName: string;
    colorVariantName: string | null;
    quantity: number;
    issued: number;
    remaining: number;
  }[];
  rounds: {
    id: string;
    status: string;
    documentNumber: string;
    deliveryNumber: string | null;
    documentDate: string | Date;
    postedAt: string | Date | null;
    totalQuantity: number;
  }[];
  /** Only a CONFIRMED / SHIPPED quotation can start a new round. */
  canDeliver: boolean;
}

/** "การส่งสินค้า" on a quotation: what has shipped, what is left, and each ใบส่งสินค้า. */
export function QuotationDeliveryCard({ documentId, progress, rounds, canDeliver }: QuotationDeliveryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const ordered = progress.reduce((sum, l) => sum + l.quantity, 0);
  const issued = progress.reduce((sum, l) => sum + Math.min(l.issued, l.quantity), 0);
  const remaining = progress.reduce((sum, l) => sum + l.remaining, 0);
  const draft = rounds.find((r) => r.status === "DRAFT");

  const newRound = () => {
    startTransition(async () => {
      try {
        const doc = await createIssueFromDocument(documentId);
        router.push(`/stock/issue/${doc.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="size-4" />
          การส่งสินค้า
          <span className="text-sm font-normal text-muted-foreground">
            ส่งแล้ว {issued}/{ordered}
            {remaining > 0 && ` · ค้างส่ง ${remaining}`}
          </span>
        </CardTitle>
        {draft ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/stock/issue/${draft.id}`}>ทำรอบส่งที่ค้างไว้ต่อ ({draft.documentNumber})</Link>
          </Button>
        ) : (
          canDeliver &&
          remaining > 0 && (
            <Button size="sm" onClick={newRound} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              สร้างรอบส่งใหม่
            </Button>
          )
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!canDeliver && rounds.length === 0 && (
          <p className="text-sm text-muted-foreground">เปลี่ยนสถานะใบเสนอราคาเป็น &quot;ยืนยันสั่งซื้อ&quot; ก่อนจึงจะออกใบส่งสินค้าได้</p>
        )}
        {canDeliver && ordered === 0 && rounds.length === 0 && (
          <p className="text-sm text-amber-700">
            ยังสร้างรอบส่งไม่ได้ เพราะไม่มีรายการที่ผูกกับสินค้าในระบบ — แก้ไขใบเสนอราคา กดปุ่ม &quot;เลือกสินค้า&quot; ในแต่ละบรรทัดเพื่อเลือกจากรายการสินค้า แล้วบันทึก
          </p>
        )}

        {rounds.length > 0 && (
          <div className="divide-y rounded-md border">
            {rounds.map((round, index) => (
              <div key={round.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="font-medium">
                  {round.status === "POSTED" ? `รอบที่ ${index + 1}` : "ร่าง"}
                </span>
                <span className="font-mono">{round.deliveryNumber ?? round.documentNumber}</span>
                <span className="text-muted-foreground">
                  {formatThaiDate(new Date(round.documentDate))} · {round.totalQuantity} หน่วย
                </span>
                {round.status === "DRAFT" && <Badge variant="outline">ยังไม่ตัดสต็อก</Badge>}
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/stock/issue/${round.id}`}>เปิด</Link>
                  </Button>
                  {round.status === "POSTED" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/stock/issue/${round.id}/delivery-note`}>
                        <FileText className="size-4" />
                        ใบส่งสินค้า
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {issued > 0 && (
          <div className="space-y-1">
            {progress.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {line.productName}
                  {line.colorVariantName && <span className="text-muted-foreground"> — {line.colorVariantName}</span>}
                </span>
                <span className={`shrink-0 font-mono ${line.remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {Math.min(line.issued, line.quantity)}/{line.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
