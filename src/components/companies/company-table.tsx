"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { deleteCompany } from "@/actions/company-actions";

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

interface CompanyTableProps {
  companies: any[];
}

export function CompanyTable({ companies }: CompanyTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "logoUrl",
      header: "โลโก้",
      cell: ({ row }) => {
        const url = row.original.logoUrl;
        return url ? (
          <Image
            src={url}
            alt={row.original.name}
            width={40}
            height={40}
            className="rounded object-contain size-10"
          />
        ) : (
          <div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
            N/A
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      accessorKey: "name",
      header: "ชื่อบริษัท",
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
      accessorKey: "bankName",
      header: "ธนาคาร",
      cell: ({ row }) => row.original.bankName ?? "-",
      enableGlobalFilter: false,
    },
    {
      accessorKey: "vatEnabled",
      header: "VAT",
      cell: ({ row }) => (
        <Badge variant={row.original.vatEnabled ? "default" : "secondary"}>
          {row.original.vatEnabled
            ? `${Number(row.original.vatRate)}%`
            : "ไม่มี"}
        </Badge>
      ),
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
              <Link href={`/companies/${row.original.id}`}>
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
    data: companies,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = String(row.original.name ?? "").toLowerCase();
      const phone = String(row.original.phone ?? "").toLowerCase();
      return name.includes(search) || phone.includes(search);
    },
  });

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteCompany(deleteId);
        toast.success("ลบบริษัทเรียบร้อยแล้ว");
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
          placeholder="ค้นหาบริษัท..."
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
                      ["logoUrl", "taxId", "bankName", "vatEnabled", "status"].includes(header.id)
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
                        ["logoUrl", "taxId", "bankName", "vatEnabled", "status"].includes(
                          cell.column.id
                        )
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
                  ไม่พบข้อมูลบริษัท
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
              คุณต้องการลบบริษัทนี้หรือไม่? การดำเนินการนี้จะเปลี่ยนสถานะเป็นไม่ใช้งาน
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
