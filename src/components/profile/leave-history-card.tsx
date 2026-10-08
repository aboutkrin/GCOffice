import { formatThaiDate } from "@/lib/thai-date";
import { formatLeaveHours } from "@/lib/leave-policy";
import {
  LEAVE_PERIOD_LABELS,
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LeaveHistoryItem } from "@/data/leave-balances";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Leave requests (any status) of one employee in one year — used on /profile and /users/[id]. */
export function LeaveHistoryCard({
  year,
  history,
  emptyText,
}: {
  year: number;
  history: LeaveHistoryItem[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ประวัติการลา ปี {year + 543}</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((l) => {
                  const start = formatThaiDate(new Date(l.startDate), "short");
                  const end = formatThaiDate(new Date(l.endDate), "short");
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap">
                        {start === end ? start : `${start} – ${end}`}
                      </TableCell>
                      <TableCell>
                        {LEAVE_TYPE_LABELS[l.type] ?? l.type}
                        <div className="text-xs text-muted-foreground">
                          {LEAVE_PERIOD_LABELS[l.period]}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatLeaveHours(l.hours)}
                        {l.unpaidHours > 0 && (
                          <div className="text-xs text-red-600">
                            หักเงิน {formatLeaveHours(l.unpaidHours)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border-0", LEAVE_STATUS_COLORS[l.status])}>
                          {LEAVE_STATUS_LABELS[l.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[l.reason, l.reviewNote && `แอดมิน: ${l.reviewNote}`].filter(Boolean).join(" · ") ||
                          "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
