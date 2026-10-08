import { LEAVE_TYPE_LABELS } from "@/lib/constants";
import {
  formatLeaveHours,
  LEAVE_BALANCE_ORDER,
  LEAVE_MAIN_TYPES,
  LEAVE_POLICIES,
} from "@/lib/leave-policy";
import { formatThaiDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import type { LeaveBalanceSummary } from "@/data/leave-balances";

/** Types worth showing: the main three always, the rest once used or requested. */
export function visibleLeaveTypes(summaries: LeaveBalanceSummary[]): string[] {
  return LEAVE_BALANCE_ORDER.filter(
    (t) =>
      (LEAVE_MAIN_TYPES as readonly string[]).includes(t) ||
      summaries.some((s) => s.balances[t].usedHours > 0 || s.pendingHours[t] > 0)
  );
}

export function LeaveBalanceCards({ summary }: { summary: LeaveBalanceSummary }) {
  const types = visibleLeaveTypes([summary]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {types.map((type) => {
        const b = summary.balances[type];
        const pending = summary.pendingHours[type];
        const limit = b.quotaHours ?? b.paidQuotaHours;
        const percent = limit ? Math.min(100, (b.usedHours / limit) * 100) : 0;
        const policy = LEAVE_POLICIES[type];
        const note =
          type === "ANNUAL" && summary.annualEligibleFrom
            ? `ได้สิทธิ์ตั้งแต่ ${formatThaiDate(new Date(summary.annualEligibleFrom))}`
            : policy?.note;

        return (
          <div key={type} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{LEAVE_TYPE_LABELS[type] ?? type}</span>
              <span className="text-xs text-muted-foreground">
                สิทธิ์ {limit === null ? "ไม่จำกัด" : `${formatLeaveHours(limit)}/ปี`}
              </span>
            </div>
            <div className="text-2xl font-bold">
              {b.remainingHours === null ? (
                <span className="text-base font-normal text-muted-foreground">ไม่จำกัดจำนวน</span>
              ) : (
                <>
                  เหลือ {formatLeaveHours(b.remainingHours)}
                </>
              )}
            </div>
            {limit !== null && limit > 0 && (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full", b.unpaidHours > 0 ? "bg-red-500" : "bg-primary")}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-0.5">
              <div>ใช้ไป {formatLeaveHours(b.usedHours)}</div>
              {pending > 0 && <div className="text-amber-600">รออนุมัติ {formatLeaveHours(pending)}</div>}
              {b.unpaidHours > 0 && (
                <div className="text-red-600">ไม่ได้รับค่าจ้าง (หักเงินเดือน) {formatLeaveHours(b.unpaidHours)}</div>
              )}
              {note && <div className="text-xs">{note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
