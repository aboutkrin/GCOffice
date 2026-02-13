"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Search, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { exportToJpg } from "@/lib/export-jpg";

import { deleteCustomer } from "@/actions/customer-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LEAD_TYPE_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINE_OA: "LINE OA",
  TIKTOK: "TikTok",
  WEBSITE: "เว็บไซต์",
  REFERRAL: "แนะนำ",
  OTHER: "อื่นๆ",
};

interface CustomerTableProps {
  customers: any[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleExportJpg = useCallback(async () => {
    const el = tableRef.current;
    if (!el) return;

    setIsExporting(true);
    try {
      await exportToJpg(el, "รายชื่อลูกค้า");
      toast.success("สร้างรูปภาพสำเร็จ");
    } catch (error) {
      console.error("JPG export failed:", error);
      toast.error("ไม่สามารถสร้างรูปภาพได้");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "code",
      header: "รหัสลูกค้า",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "customerName",
      header: "ชื่อ",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customerName}</div>
          {row.original.contactPerson && (
            <div className="text-xs text-muted-foreground">
              ติดต่อ: {row.original.contactPerson}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "ประเภท",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "COMPANY" ? "default" : "secondary"}>
          {row.original.type === "COMPANY" ? "นิติบุคคล" : "บุคคลธรรมดา"}
        </Badge>
      ),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "companyName",
      header: "บริษัท",
      cell: ({ row }) => row.original.companyName ?? "-",
    },
    {
      accessorKey: "taxId",
      header: "เลขประจำตัวผู้เสียภาษี",
      cell: ({ row }) => row.original.taxId ?? "-",
      enableGlobalFilter: false,
    },
    {
      accessorKey: "phone",
      header: "เบอร์โทร",
      cell: ({ row }) => row.original.phone ?? "-",
    },
    {
      accessorKey: "leadType",
      header: "ที่มา",
      cell: ({ row }) =>
        row.original.leadType
          ? LEAD_TYPE_LABELS[row.original.leadType] ?? row.original.leadType
          : "-",
      enableGlobalFilter: false,
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>
          {row.original.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
        </Badge>
      ),
      enableGlobalFilter: false,
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/customers/${row.original.id}`}>
                <Pencil className="size-4" />
                แก้ไข
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="size-4" />
              ลบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableGlobalFilter: false,
    },
  ];

  const table = useReactTable({
    data: customers,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const code = String(row.original.code ?? "").toLowerCase();
      const name = String(row.original.customerName ?? "").toLowerCase();
      const company = String(row.original.companyName ?? "").toLowerCase();
      const phone = String(row.original.phone ?? "").toLowerCase();
      return (
        code.includes(search) || name.includes(search) || company.includes(search) || phone.includes(search)
      );
    },
  });

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteCustomer(deleteId);
        toast.success("ลบลูกค้าเรียบร้อยแล้ว");
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      } finally {
        setDeleteId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาลูกค้า..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJpg}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
          JPG
        </Button>
      </div>

      <div ref={tableRef} className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      ["companyName", "taxId", "leadType", "status"].includes(header.id)
                        ? "hidden md:table-cell"
                        : ""
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                    <TableCell
                      key={cell.id}
                      className={
                        ["companyName", "taxId", "leadType", "status"].includes(cell.column.id)
                          ? "hidden md:table-cell"
                          : ""
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  ไม่พบข้อมูลลูกค้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบลูกค้านี้หรือไม่? การดำเนินการนี้จะเปลี่ยนสถานะเป็นไม่ใช้งาน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive"
              disabled={isPending}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
