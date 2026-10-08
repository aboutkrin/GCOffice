"use client";

import Link from "next/link";
import { formatLeaveHours, LEAVE_MAIN_TYPES } from "@/lib/leave-policy";
import type { LeaveBalanceSummary } from "@/data/leave-balances";
import { useRouter } from "next/navigation";
import { Ship, UserCheck, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatThaiDate } from "@/lib/thai-date";
import {
  CHINA_SHIPMENT_STATUS_COLORS,
  CHINA_SHIPMENT_STATUS_LABELS,
  LEAVE_PERIOD_LABELS,
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
} from "@/lib/constants";
import type { CalendarLeaveItem, CalendarShipmentItem } from "@/data/team-calendar";
import { LeaveActionButtons, ShipmentStatusButtons } from "./item-actions";

function daysUntil(iso: string): number {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = Date.parse(`${todayKey}T00:00:00Z`);
  const target = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

function etaText(s: CalendarShipmentItem): { text: string; className: string } {
  if (s.status === "ARRIVED_TH") {
    return { text: "ถึงไทยแล้ว รอรับเข้าคลัง", className: "text-violet-700" };
  }
  if (!s.etaDate) return { text: "ยังไม่ทราบวันถึง", className: "text-muted-foreground" };
  const days = daysUntil(s.etaDate);
  if (days > 0) return { text: `อีก ${days} วันถึง`, className: "text-sky-700" };
  if (days === 0) return { text: "คาดว่าถึงวันนี้", className: "text-amber-700 font-medium" };
  return { text: `เลยกำหนด ${-days} วัน`, className: "text-red-600 font-medium" };
}

export function UpcomingShipmentsCard({ shipments }: { shipments: CalendarShipmentItem[] }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Ship className="h-5 w-5" />
          ของจากจีนที่กำลังมา
          {shipments.length > 0 && <Badge variant="secondary">{shipments.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shipments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            ไม่มีของที่อยู่ระหว่างขนส่ง
          </p>
        ) : (
          <ul className="space-y-3">
            {shipments.map((s) => {
              const eta = etaText(s);
              return (
                <li key={s.id} className="space-y-1.5 rounded-md border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        จีนส่ง {formatThaiDate(new Date(s.shippedDate), "short")}
                        {s.etaDate && ` · ETA ${formatThaiDate(new Date(s.etaDate), "short")}`}
                        {s.containerNo && ` · ล็อต ${s.containerNo}`}
                      </div>
                      <div className={cn("text-xs", eta.className)}>{eta.text}</div>
                    </div>
                    <Badge className={cn("shrink-0", CHINA_SHIPMENT_STATUS_COLORS[s.status])}>
                      {CHINA_SHIPMENT_STATUS_LABELS[s.status]}
                    </Badge>
                  </div>
                  <ShipmentStatusButtons shipment={s} onChanged={() => router.refresh()} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingLeavesCard({
  leaves,
  currentUserId,
}: {
  leaves: CalendarLeaveItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserCheck className="h-5 w-5" />
          คำขอลารออนุมัติ
          {leaves.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800">{leaves.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaves.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">ไม่มีคำขอลาค้างอยู่</p>
        ) : (
          <ul className="space-y-3">
            {leaves.map((l) => {
              const start = formatThaiDate(new Date(l.startDate), "short");
              const end = formatThaiDate(new Date(l.endDate), "short");
              return (
                <li key={l.id} className="space-y-1.5 rounded-md border p-2.5">
                  <div className="font-medium">{l.profileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {LEAVE_TYPE_LABELS[l.type]} · {LEAVE_PERIOD_LABELS[l.period]} ·{" "}
                    {start === end ? start : `${start} – ${end}`}
                  </div>
                  {l.reason && <div className="text-sm">{l.reason}</div>}
                  <LeaveActionButtons
                    leave={l}
                    isAdmin
                    currentUserId={currentUserId}
                    onChanged={() => router.refresh()}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function MyLeavesCard({
  leaves,
  currentUserId,
  balance,
}: {
  leaves: CalendarLeaveItem[];
  currentUserId: string;
  balance?: LeaveBalanceSummary | null;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserMinus className="h-5 w-5" />
          การลาของฉัน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {balance && (
          <Link
            href="/profile?tab=leave"
            className="flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-muted/50 px-2.5 py-2 text-xs hover:bg-muted"
          >
            <span className="text-muted-foreground">คงเหลือปีนี้:</span>
            {LEAVE_MAIN_TYPES.map((t) => {
              const remaining = balance.balances[t].remainingHours;
              return (
                <span key={t}>
                  {LEAVE_TYPE_LABELS[t].replace("ลา", "")} {remaining === null ? "-" : formatLeaveHours(remaining)}
                </span>
              );
            })}
            <span className="ml-auto text-primary">ดูทั้งหมด →</span>
          </Link>
        )}
        {leaves.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            ยังไม่มีการลา กด &quot;ขอลา&quot; ในปฏิทินเพื่อส่งคำขอ
          </p>
        ) : (
          <ul className="space-y-3">
            {leaves.map((l) => {
              const start = formatThaiDate(new Date(l.startDate), "short");
              const end = formatThaiDate(new Date(l.endDate), "short");
              return (
                <li key={l.id} className="space-y-1.5 rounded-md border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm">
                      {LEAVE_TYPE_LABELS[l.type]} · {LEAVE_PERIOD_LABELS[l.period]}
                      <div className="text-xs text-muted-foreground">
                        {start === end ? start : `${start} – ${end}`}
                      </div>
                    </div>
                    <Badge className={cn("shrink-0", LEAVE_STATUS_COLORS[l.status])}>
                      {LEAVE_STATUS_LABELS[l.status]}
                    </Badge>
                  </div>
                  {l.reviewNote && (
                    <div className="text-xs text-muted-foreground">หมายเหตุแอดมิน: {l.reviewNote}</div>
                  )}
                  {l.status !== "REJECTED" && (
                    <LeaveActionButtons
                      leave={l}
                      isAdmin={false}
                      currentUserId={currentUserId}
                      onChanged={() => router.refresh()}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
