"use client";

import { useState, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Eye, Loader2, RefreshCw, SearchCheck } from "lucide-react";
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

import { SyncDetailsView } from "./sync-details-view";

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
  /** Prisma Json column — shape matches CatalogSyncDetails but isn't typed as such at the DB layer. */
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
  const [detailLog, setDetailLog] = useState<SyncLog | null>(null);

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
    {
      id: "detail",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-xs"
          title="ดูรายละเอียด"
          onClick={() => setDetailLog(row.original)}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
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
            <SyncDetailsView
              mode="preview"
              totalFetched={preview.totalFetched}
              created={preview.created}
              updated={preview.updated}
              deactivated={preview.deactivated}
              failed={preview.failed}
              details={preview.details}
            />
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

      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="sm:max-w-2xl">
          {detailLog && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatThaiDateTime(new Date(detailLog.startedAt))}
                </DialogTitle>
                <DialogDescription>
                  {SYNC_TRIGGER_LABELS[detailLog.trigger] ?? detailLog.trigger} ·{" "}
                  {SYNC_SCOPE_LABELS[detailLog.scope] ?? detailLog.scope}
                  {detailLog.completedAt &&
                    ` · ใช้เวลา ${Math.round(
                      (new Date(detailLog.completedAt).getTime() -
                        new Date(detailLog.startedAt).getTime()) /
                        1000
                    )} วินาที`}
                </DialogDescription>
              </DialogHeader>

              <SyncDetailsView
                mode="history"
                totalFetched={detailLog.totalFetched}
                created={detailLog.created}
                updated={detailLog.updated}
                deactivated={detailLog.deactivated}
                failed={detailLog.failed}
                details={(detailLog.details as CatalogSyncDetails | null) ?? null}
                errorMessage={detailLog.errorMessage}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailLog(null)}>
                  ปิด
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
