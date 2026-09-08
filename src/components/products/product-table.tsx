"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { formatNumber } from "@/lib/thai-currency";
import { deleteProduct, permanentDeleteProduct } from "@/actions/product-actions";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductThumb } from "@/components/ui/product-thumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ProductTableProps {
  products: any[];
  categories: any[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    search: string;
    status: string;
    categoryId: string;
  };
  canDelete?: boolean;
}

export function ProductTable({
  products,
  categories,
  total,
  page,
  totalPages,
  filters,
  canDelete = false,
}: ProductTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    value: searchValue,
    onChange: onSearchChange,
    flush: flushSearch,
    reset: resetSearch,
    isSearching,
  } = useDebouncedSearchParam({ initialValue: filters.search });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Reset to page 1 when filters change (unless we're explicitly setting page)
      if (!("page" in updates)) {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    flushSearch();
  };

  const clearFilters = () => {
    resetSearch();
    router.push(pathname);
  };

  const hasActiveFilters = filters.search || filters.status || filters.categoryId;

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "imageUrl",
      header: "รูป",
      cell: ({ row }) => (
        <ProductThumb src={row.original.imageUrl} alt={row.original.name} />
      ),
    },
    {
      accessorKey: "name",
      header: "ชื่อสินค้า",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.name}
          {row.original.source === "WEBSITE" && (
            <Badge className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0">
              เว็บ
            </Badge>
          )}
          {row.original.source === "WOOCOMMERCE" && (
            <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">
              WC
            </Badge>
          )}
          {row.original._count?.colorVariants > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {row.original._count.colorVariants} สี
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category.name",
      header: "หมวดหมู่",
      cell: ({ row }) => row.original.category?.name ?? "-",
    },
    {
      accessorKey: "basePrice",
      header: "ราคา",
      cell: ({ row }) => formatNumber(row.original.basePrice),
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>
          {row.original.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
        </Badge>
      ),
    },
    {
      accessorKey: "sku",
      header: "รหัส",
    },
    {
      id: "createdBy",
      header: "ผู้สร้าง",
      cell: ({ row }) => {
        const c = row.original.createdBy;
        if (!c) return "-";
        return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
      },
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
              <Link href={`/products/${row.original.id}`}>
                <Pencil className="size-4" />
                แก้ไข
              </Link>
            </DropdownMenuItem>
            {/* Website-synced products are removed on goodchoiceth.com, not here */}
            {canDelete && row.original.source !== "WEBSITE" &&
              (row.original.status === "ACTIVE" ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteId(row.original.id)}
                >
                  <Trash2 className="size-4" />
                  ลบ
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setPermanentDeleteId(row.original.id)}
                >
                  <Trash2 className="size-4" />
                  ลบถาวร
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteProduct(deleteId);
        toast.success("ลบสินค้าเรียบร้อยแล้ว");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
        );
      } finally {
        setDeleteId(null);
      }
    });
  }

  function handlePermanentDelete() {
    if (!permanentDeleteId) return;
    startTransition(async () => {
      try {
        await permanentDeleteProduct(permanentDeleteId);
        toast.success("ลบสินค้าถาวรเรียบร้อยแล้ว");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
        );
      } finally {
        setPermanentDeleteId(null);
      }
    });
  }

  const startItem = (page - 1) * 10 + 1;
  const endItem = Math.min(page * 10, total);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          )}
          <Input
            placeholder="ค้นหาชื่อหรือรหัสสินค้า..."
            value={searchValue}
            onChange={onSearchChange}
            className="pl-9"
          />
        </form>
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            updateParams({ status: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะทั้งหมด</SelectItem>
            <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
            <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.categoryId || "all"}
          onValueChange={(value) =>
            updateParams({ categoryId: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="หมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      ["imageUrl", "basePrice", "status", "sku", "createdBy"].includes(header.id)
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
                        ["imageUrl", "basePrice", "status", "sku", "createdBy"].includes(cell.column.id)
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
                  ไม่พบข้อมูลสินค้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง {startItem}-{endItem} จาก {total} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <span className="text-sm text-muted-foreground">
              หน้า {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation (soft delete) */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสินค้านี้หรือไม่? การดำเนินการนี้จะเปลี่ยนสถานะเป็นไม่ใช้งาน
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

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!permanentDeleteId} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบถาวร</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสินค้านี้ออกจากระบบถาวรหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              variant="destructive"
              disabled={isPending}
            >
              ลบถาวร
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
