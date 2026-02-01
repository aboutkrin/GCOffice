"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { deleteHoliday, deleteHolidayGroup } from "@/actions/holiday-actions";
import { formatThaiDate } from "@/lib/thai-date";

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

interface HolidayGroup {
  ids: string[];
  name: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
}

function groupHolidays(holidays: any[]): HolidayGroup[] {
  if (holidays.length === 0) return [];

  const groups: HolidayGroup[] = [];
  let current: HolidayGroup = {
    ids: [holidays[0].id],
    name: holidays[0].name,
    startDate: holidays[0].date,
    endDate: holidays[0].date,
    isRecurring: holidays[0].isRecurring,
  };

  for (let i = 1; i < holidays.length; i++) {
    const h = holidays[i];
    const prevDate = new Date(current.endDate);
    const currDate = new Date(h.date);
    const diffMs = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (
      h.name === current.name &&
      h.isRecurring === current.isRecurring &&
      diffDays === 1
    ) {
      current.ids.push(h.id);
      current.endDate = h.date;
    } else {
      groups.push(current);
      current = {
        ids: [h.id],
        name: h.name,
        startDate: h.date,
        endDate: h.date,
        isRecurring: h.isRecurring,
      };
    }
  }
  groups.push(current);

  return groups;
}

function formatGroupDate(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start.getTime() === end.getTime()) {
    return formatThaiDate(start, "short");
  }

  return `${formatThaiDate(start, "short")} - ${formatThaiDate(end, "short")}`;
}

interface HolidayTableProps {
  holidays: any[];
}

export function HolidayTable({ holidays }: HolidayTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteGroup, setDeleteGroup] = useState<HolidayGroup | null>(null);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => groupHolidays(holidays), [holidays]);

  const filteredGroups = useMemo(() => {
    if (!globalFilter) return groups;
    const search = globalFilter.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(search));
  }, [groups, globalFilter]);

  function handleDelete() {
    if (!deleteGroup) return;
    startTransition(async () => {
      try {
        if (deleteGroup.ids.length === 1) {
          await deleteHoliday(deleteGroup.ids[0]);
        } else {
          await deleteHolidayGroup(deleteGroup.ids);
        }
        toast.success("ลบวันหยุดเรียบร้อยแล้ว");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      } finally {
        setDeleteGroup(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาวันหยุด..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อวันหยุด</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length ? (
              filteredGroups.map((group) => (
                <TableRow key={group.ids[0]}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>
                    {formatGroupDate(group.startDate, group.endDate)}
                    {group.ids.length > 1 && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        ({group.ids.length} วัน)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {group.isRecurring ? (
                      <Badge variant="secondary">ทุกปี</Badge>
                    ) : (
                      <Badge variant="outline">เฉพาะปี</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/holidays/${group.ids[0]}`}>
                            <Pencil className="size-4" />
                            แก้ไข
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteGroup(group)}
                        >
                          <Trash2 className="size-4" />
                          ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  ไม่พบข้อมูลวันหยุด
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteGroup}
        onOpenChange={() => setDeleteGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGroup && deleteGroup.ids.length > 1
                ? `คุณต้องการลบวันหยุด "${deleteGroup.name}" (${deleteGroup.ids.length} วัน) หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
                : "คุณต้องการลบวันหยุดนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"}
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
