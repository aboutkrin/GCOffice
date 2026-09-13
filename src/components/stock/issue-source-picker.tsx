"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PackageMinus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatThaiDateShort } from "@/lib/thai-date";
import { createIssueFromDocument } from "@/actions/stock-document-actions";
import { getIssuableDocumentsAction } from "@/actions/stock-document-data-actions";

export function IssueSourcePicker() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await getIssuableDocumentsAction(query);
        setDocuments(result);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [open, query]);

  const handleSelect = (documentId: string) => {
    startTransition(async () => {
      try {
        const doc = await createIssueFromDocument(documentId);
        setOpen(false);
        router.push(`/stock/issue/${doc.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PackageMinus className="size-4" />
          เบิกตามเอกสาร
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>เลือกใบเสนอราคาที่ต้องการเบิก</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเลขที่เอกสาร..."
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
            <div className="text-center text-sm text-muted-foreground py-8">
              ไม่พบเอกสารที่ต้องเบิก
            </div>
          )}
          {!loading && (
            <div className="space-y-1">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelect(doc.id)}
                  className="w-full flex items-center justify-between gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-medium">{doc.documentNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatThaiDateShort(new Date(doc.documentDate))}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ค้างเบิก {doc.remainingTotal}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
