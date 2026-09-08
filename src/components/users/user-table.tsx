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

import { deleteUser } from "@/actions/user-actions";
import { USER_ROLE_LABELS, USER_ROLE_COLORS } from "@/lib/constants";

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

interface UserTableProps {
  users: any[];
  currentUserId: string;
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<any>[] = [
    {
      id: "name",
      header: "ชื่อ",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {[row.original.firstName, row.original.lastName].filter(Boolean).join(" ") || "-"}
          </div>
          {row.original.id === currentUserId && (
            <div className="text-xs text-muted-foreground">คุณ</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "username",
      header: "ชื่อผู้ใช้",
      cell: ({ row }) => row.original.username ?? "-",
    },
    {
      accessorKey: "email",
      header: "อีเมล",
    },
    {
      accessorKey: "role",
      header: "สิทธิ์การใช้งาน",
      cell: ({ row }) => (
        <Badge className={USER_ROLE_COLORS[row.original.role] ?? ""}>
          {USER_ROLE_LABELS[row.original.role] ?? row.original.role}
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
              <Link href={`/users/${row.original.id}`}>
                <Pencil className="size-4" />
                แก้ไข
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={row.original.id === currentUserId}
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
    data: users,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const email = String(row.original.email ?? "").toLowerCase();
      const username = String(row.original.username ?? "").toLowerCase();
      const name = [row.original.firstName, row.original.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return email.includes(search) || username.includes(search) || name.includes(search);
    },
  });

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteUser(deleteId);
        toast.success("ลบผู้ใช้งานเรียบร้อยแล้ว");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
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
          placeholder="ค้นหาผู้ใช้งาน..."
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
                    className={["role", "status"].includes(header.id) ? "hidden md:table-cell" : ""}
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
                        ["role", "status"].includes(cell.column.id) ? "hidden md:table-cell" : ""
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
                  ไม่พบข้อมูลผู้ใช้งาน
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
              คุณต้องการลบผู้ใช้งานนี้หรือไม่? หากมีเอกสารที่สร้างโดยผู้ใช้นี้อยู่ในระบบ
              จะไม่สามารถลบได้ กรุณาปิดการใช้งานแทน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive" disabled={isPending}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
