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
import { MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { deletePaymentTermTemplate } from "@/actions/payment-term-template-actions";

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

interface PaymentTermTemplateTableProps {
  templates: any[];
}

export function PaymentTermTemplateTable({ templates }: PaymentTermTemplateTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "ชื่อเทมเพลต",
    },
    {
      id: "itemCount",
      header: "จำนวนงวด",
      cell: ({ row }) => `${row.original.items?.length ?? 0} งวด`,
      enableGlobalFilter: false,
    },
    {
      id: "summary",
      header: "รายละเอียด",
      cell: ({ row }) => {
        const items = row.original.items ?? [];
        if (items.length === 0) return "-";
        return items
          .map((item: any) =>
            item.type === "PERCENTAGE"
              ? `${item.name} ${item.value}%`
              : `${item.name} ฿${item.value}`
          )
          .join(", ");
      },
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
              <Link href={`/payment-terms/${row.original.id}`}>
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
    data: templates,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = String(row.original.name ?? "").toLowerCase();
      return name.includes(search);
    },
  });

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deletePaymentTermTemplate(deleteId);
        toast.success("ลบเทมเพลตเรียบร้อยแล้ว");
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      } finally {
        setDeleteId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาเทมเพลต..."
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
                      ["summary", "status"].includes(header.id)
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
                        ["summary", "status"].includes(cell.column.id)
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
                  ไม่พบข้อมูลเทมเพลต
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
              คุณต้องการลบเทมเพลตนี้หรือไม่? การดำเนินการนี้จะเปลี่ยนสถานะเป็นไม่ใช้งาน
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
