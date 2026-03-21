"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Search, GitMerge } from "lucide-react";
import { toast } from "sonner";

import { deleteCustomer, mergeCustomers } from "@/actions/customer-actions";
import { CustomerSelect } from "@/components/customers/customer-select";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [mergeSource, setMergeSource] = useState<any | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
              onClick={() => {
                setMergeSource(row.original);
                setMergeTargetId(null);
              }}
            >
              <GitMerge className="size-4" />
              รวมลูกค้า
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

  function handleMerge() {
    if (!mergeSource || !mergeTargetId) return;
    startTransition(async () => {
      try {
        await mergeCustomers(mergeSource.id, mergeTargetId);
        toast.success("รวมลูกค้าเรียบร้อยแล้ว");
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      } finally {
        setMergeSource(null);
        setMergeTargetId(null);
      }
    });
  }

  const mergeTargetCustomers = customers.filter(
    (c) => c.id !== mergeSource?.id && c.status === "ACTIVE"
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาลูกค้า..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
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

      <Dialog open={!!mergeSource} onOpenChange={() => { setMergeSource(null); setMergeTargetId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รวมลูกค้า</DialogTitle>
            <DialogDescription>
              ย้ายเอกสารทั้งหมดของ {mergeSource?.code} ({mergeSource?.customerName}) ไปยังลูกค้าที่เลือก
              แล้วปิดการใช้งาน {mergeSource?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">เลือกลูกค้าปลายทาง</label>
            <CustomerSelect
              value={mergeTargetId ?? undefined}
              onSelect={(customer) => setMergeTargetId(customer.id)}
              customers={mergeTargetCustomers}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMergeSource(null); setMergeTargetId(null); }}>
              ยกเลิก
            </Button>
            <Button onClick={handleMerge} disabled={!mergeTargetId || isPending}>
              {isPending ? "กำลังรวม..." : "ยืนยันรวมลูกค้า"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
