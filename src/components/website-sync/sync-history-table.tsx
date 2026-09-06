"use client";

import { useState, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Loader2, RefreshCw, SearchCheck } from "lucide-react";
import { toast } from "sonner";

import {
  previewCatalogSync,
  triggerCatalogSync,
  type CatalogSyncSummary,
} from "@/actions/catalog-actions";
import type { CatalogSyncDetails } from "@/lib/catalog/sync";
import {
  SYNC_SCOPE_LABELS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
  SYNC_TRIGGER_LABELS,
} from "@/lib/constants";
import { formatThaiDateTime } from "@/lib/thai-date";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SyncLog {
  id: string;
  status: string;
  trigger: string;
  scope: string;
  dryRun: boolean;
  totalFetched: number;
  created: number;
  updated: number;
  deactivated: number;
  failed: number;
  errorMessage: string | null;
  details?: unknown;
  startedAt: string | Date;
  completedAt: string | Date | null;
}

interface SyncHistoryTableProps {
  syncLogs: SyncLog[];
  lastSyncAt: string | Date | null;
}

type Preview = CatalogSyncSummary & { details: CatalogSyncDetails };

export function SyncHistoryTable({ syncLogs, lastSyncAt }: SyncHistoryTableProps) {
  const [isSyncing, startSyncing] = useTransition();
  const [isPreviewing, startPreviewing] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const busy = isSyncing || isPreviewing;

  function handlePreview() {
    startPreviewing(async () => {
      try {
        const result = await previewCatalogSync();
        setPreview(result);
        setPreviewOpen(true);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจสอบ"
        );
      }
    });
  }

  function handleSync() {
    setPreviewOpen(false);
    startSyncing(async () => {
      try {
        const result = await triggerCatalogSync();
        toast.success(
          `ซิงค์สำเร็จ: เพิ่ม ${result.created} / อัปเดต ${result.updated} / ปิดใช้งาน ${result.deactivated} / ล้มเหลว ${result.failed}`
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการซิงค์"
        );
      }
    });
  }

  const columns: ColumnDef<SyncLog>[] = [
    {
      accessorKey: "startedAt",
      header: "วันที่",
      cell: ({ row }) => formatThaiDateTime(new Date(row.original.startedAt)),
    },
    {
      accessorKey: "trigger",
      header: "ประเภท",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {SYNC_TRIGGER_LABELS[row.original.trigger] ?? row.original.trigger}
          {row.original.dryRun && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              ทดสอบ
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "scope",
      header: "ขอบเขต",
      cell: ({ row }) => SYNC_SCOPE_LABELS[row.original.scope] ?? row.original.scope,
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge
          className={SYNC_STATUS_COLORS[row.original.status] ?? ""}
          title={row.original.errorMessage ?? undefined}
        >
          {SYNC_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    { accessorKey: "totalFetched", header: "ทั้งหมด" },
    { accessorKey: "created", header: "เพิ่มใหม่" },
    { accessorKey: "updated", header: "อัปเดต" },
    { accessorKey: "deactivated", header: "ปิดใช้งาน" },
    { accessorKey: "failed", header: "ล้มเหลว" },
  ];

  const table = useReactTable({
    data: syncLogs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {lastSyncAt
            ? `ซิงค์ล่าสุด: ${formatThaiDateTime(new Date(lastSyncAt))}`
            : "ยังไม่เคยซิงค์"}
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePreview} disabled={busy} variant="outline">
            {isPreviewing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SearchCheck className="size-4" />
            )}
            ตรวจสอบก่อนซิงค์
          </Button>
          <Button onClick={handleSync} disabled={busy}>
            {isSyncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            ซิงค์ตอนนี้
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  ยังไม่มีประวัติการซิงค์
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>ผลการตรวจสอบก่อนซิงค์</DialogTitle>
            <DialogDescription>
              ยังไม่มีการเปลี่ยนแปลงข้อมูลสินค้า — นี่คือสิ่งที่จะเกิดขึ้นเมื่อกด &quot;ซิงค์ตอนนี้&quot;
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-5 text-sm">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="สินค้าบนเว็บ" value={preview.totalFetched} />
                  <Stat label="จะเพิ่มใหม่" value={preview.details.toCreate.length} />
                  <Stat label="จะอัปเดต" value={preview.details.toUpdate} />
                  <Stat label="จะปิดใช้งาน" value={preview.details.toDeactivate.length} />
                </div>

                <Section
                  title="สินค้าที่จะเพิ่มใหม่"
                  count={preview.details.toCreate.length}
                  emptyText="ไม่มี"
                >
                  <ul className="list-disc pl-5 space-y-0.5">
                    {preview.details.toCreate.map((p, i) => (
                      <li key={`${p.sku}-${i}`}>
                        <span className="font-mono text-xs">{p.sku}</span> — {p.name}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  title="สินค้าที่จะถูกปิดใช้งาน (ไม่มีบนเว็บไซต์แล้ว)"
                  count={preview.details.toDeactivate.length}
                  emptyText="ไม่มี"
                >
                  <ul className="list-disc pl-5 space-y-0.5">
                    {preview.details.toDeactivate.map((p) => (
                      <li key={p.sku}>
                        <span className="font-mono text-xs">{p.sku}</span> — {p.name}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  title="หมวดหมู่ที่จะสร้างใหม่"
                  count={preview.details.categoriesToCreate.length}
                  emptyText="ไม่มี"
                >
                  <ul className="list-disc pl-5 space-y-0.5">
                    {preview.details.categoriesToCreate.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </Section>

                <Section
                  title="สีที่ชื่อไม่ตรงกัน"
                  count={preview.details.unmatchedColours.length}
                  emptyText="ไม่มี"
                  hint="สีใน GCOffice ที่ชื่อไม่ตรงกับเว็บไซต์จะไม่ถูกรวมกัน — สีเดิมจะคงอยู่ (พร้อมสต็อค) และสีจากเว็บจะถูกเพิ่มใหม่ หากต้องการรวม ให้เปลี่ยนชื่อสีใน GCOffice ให้ตรงกับเว็บไซต์ก่อนซิงค์"
                >
                  <div className="space-y-2">
                    {preview.details.unmatchedColours.map((u) => (
                      <div key={u.productSku} className="rounded-md border p-2">
                        <div className="font-medium">
                          <span className="font-mono text-xs">{u.productSku}</span> — {u.productName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          GCOffice: {u.gcofficeNames.join(", ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          เว็บไซต์: {u.websiteNames.join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                {preview.details.errors.length > 0 && (
                  <Section
                    title="ข้อผิดพลาด"
                    count={preview.details.errors.length}
                    emptyText=""
                  >
                    <ul className="list-disc pl-5 space-y-0.5 text-red-700">
                      {preview.details.errors.map((e) => (
                        <li key={e.websiteProductId}>
                          #{e.websiteProductId} {e.name}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              ปิด
            </Button>
            <Button type="button" onClick={handleSync} disabled={busy}>
              {isSyncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              ซิงค์ตอนนี้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value.toLocaleString("th-TH")}</div>
    </div>
  );
}

function Section({
  title,
  count,
  emptyText,
  hint,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="font-medium">{title}</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {count}
        </Badge>
      </div>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      {count === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}
