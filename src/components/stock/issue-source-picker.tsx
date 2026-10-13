"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PackageMinus, Search, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatThaiDateShort } from "@/lib/thai-date";
import { createIssueFromDocument } from "@/actions/stock-document-actions";
import { getIssuableDocumentsAction } from "@/actions/stock-document-data-actions";

interface IssuableDocument {
  id: string;
  documentNumber: string;
  documentDate: string | Date;
  customerName: string;
  remainingTotal: number;
  draftRound: { id: string; documentNumber: string } | null;
}

interface IssueSourcePickerProps {
  /** "issue" = เบิกตามเอกสาร on /stock/issue, "delivery" = สร้างใบส่งสินค้า on /delivery-notes. */
  mode?: "issue" | "delivery";
}

/**
 * Picks a CONFIRMED / SHIPPED quotation with something left to ship and opens
 * a new ISSUE draft for it (= one delivery round). A quotation that already
 * has an unposted draft opens that draft instead of starting a second one.
 */
export function IssueSourcePicker({ mode = "issue" }: IssueSourcePickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<IssuableDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const delivery = mode === "delivery";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await getIssuableDocumentsAction(query);
        setDocuments(result as IssuableDocument[]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [open, query]);

  const handleSelect = (doc: IssuableDocument) => {
    if (doc.draftRound) {
      setOpen(false);
      router.push(`/stock/issue/${doc.draftRound.id}`);
      return;
    }
    startTransition(async () => {
      try {
        const created = await createIssueFromDocument(doc.id);
        setOpen(false);
        router.push(`/stock/issue/${created.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {delivery ? (
          <Button>
            <Truck className="size-4" />
            สร้างใบส่งสินค้า
          </Button>
        ) : (
          <Button variant="outline">
            <PackageMinus className="size-4" />
            เบิกตามเอกสาร
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{delivery ? "เลือกใบเสนอราคาที่จะส่งสินค้า" : "เลือกใบเสนอราคาที่ต้องการเบิก"}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเลขใบเสนอราคา / ชื่อลูกค้า..."
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[320px]">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" />
              กำลังโหลด...
            </div>
          )}
          {!loading && documents.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8 px-4">
              {query
                ? "ไม่พบใบเสนอราคาที่ยืนยันแล้วและยังมีของค้างส่ง"
                : delivery
                  ? "ไม่มีใบเสนอราคาที่ค้างส่ง — ใบส่งสินค้าออกได้เฉพาะใบเสนอราคาที่ยืนยันสั่งซื้อแล้ว"
                  : "ไม่พบเอกสารที่ต้องเบิก"}
            </div>
          )}
          {!loading && (
            <div className="space-y-1">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelect(doc)}
                  className="w-full flex items-center justify-between gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span className="font-mono">{doc.documentNumber}</span>
                      <span className="text-muted-foreground font-normal"> · {doc.customerName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatThaiDateShort(new Date(doc.documentDate))}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {delivery ? "ค้างส่ง" : "ค้างเบิก"} {doc.remainingTotal}
                    </span>
                    {doc.draftRound && (
                      <Badge variant="outline" className="text-xs font-normal">
                        มีร่างค้างอยู่ ({doc.draftRound.documentNumber})
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
