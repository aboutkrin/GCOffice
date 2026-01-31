"use client";

import { useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { triggerWooCommerceSync } from "@/actions/woocommerce-actions";
import {
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
  SYNC_TRIGGER_LABELS,
} from "@/lib/constants";
import { formatThaiDateTime } from "@/lib/thai-date";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errorMessage: string | null;
  startedAt: string | Date;
  completedAt: string | Date | null;
}

interface SyncHistoryTableProps {
  syncLogs: SyncLog[];
  configId: string | null;
  lastSyncAt: string | Date | null;
}

export function SyncHistoryTable({
  syncLogs,
  configId,
  lastSyncAt,
}: SyncHistoryTableProps) {
  const [isSyncing, startSyncing] = useTransition();

  function handleSync() {
    if (!configId) {
      toast.error("กรุณาบันทึกการตั้งค่าก่อนซิงค์");
      return;
    }

    startSyncing(async () => {
      try {
        const result = await triggerWooCommerceSync(configId);
        toast.success(
          `ซิงค์สำเร็จ: เพิ่ม ${result.created} / อัปเดต ${result.updated} / ข้าม ${result.skipped} / ล้มเหลว ${result.failed}`
        );
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาดในการซิงค์"
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
      cell: ({ row }) =>
        SYNC_TRIGGER_LABELS[row.original.trigger] ?? row.original.trigger,
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge
          className={SYNC_STATUS_COLORS[row.original.status] ?? ""}
        >
          {SYNC_STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "totalFetched",
      header: "ทั้งหมด",
    },
    {
      accessorKey: "created",
      header: "เพิ่มใหม่",
    },
    {
      accessorKey: "updated",
      header: "อัปเดต",
    },
    {
      accessorKey: "skipped",
      header: "ข้าม",
    },
    {
      accessorKey: "failed",
      header: "ล้มเหลว",
    },
  ];

  const table = useReactTable({
    data: syncLogs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {lastSyncAt
            ? `ซิงค์ล่าสุด: ${formatThaiDateTime(new Date(lastSyncAt))}`
            : "ยังไม่เคยซิงค์"}
        </div>
        <Button
          onClick={handleSync}
          disabled={isSyncing || !configId}
          variant="outline"
        >
          {isSyncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          ซิงค์ตอนนี้
        </Button>
      </div>

      <div className="rounded-md border">
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
    </div>
  );
}
