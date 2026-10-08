"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Ship, PackageCheck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewLeaveRequest, cancelLeaveRequest } from "@/actions/leave-actions";
import { setChinaShipmentStatus } from "@/actions/china-shipment-actions";
import type { CalendarLeaveItem, CalendarShipmentItem } from "@/data/team-calendar";

function useRun(onChanged: () => void) {
  const [isPending, startTransition] = useTransition();
  function run(fn: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(success);
        onChanged();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
        );
      }
    });
  }
  return { isPending, run };
}

/** Approve / reject (admin, pending) and cancel (owner or admin). */
export function LeaveActionButtons({
  leave,
  isAdmin,
  currentUserId,
  onChanged,
}: {
  leave: CalendarLeaveItem;
  isAdmin: boolean;
  currentUserId: string;
  onChanged: () => void;
}) {
  const { isPending, run } = useRun(onChanged);
  const canCancel = isAdmin || leave.profileId === currentUserId;

  return (
    <div className="flex flex-wrap gap-1.5">
      {isAdmin && leave.status === "PENDING" && (
        <>
          <Button
            size="sm"
            className="h-7 bg-green-600 hover:bg-green-700"
            disabled={isPending}
            onClick={() =>
              run(() => reviewLeaveRequest(leave.id, { approve: true }), "อนุมัติการลาแล้ว")
            }
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            อนุมัติ
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-red-600"
            disabled={isPending}
            onClick={() =>
              run(() => reviewLeaveRequest(leave.id, { approve: false }), "ไม่อนุมัติการลา")
            }
          >
            <X className="mr-1 h-3.5 w-3.5" />
            ไม่อนุมัติ
          </Button>
        </>
      )}
      {canCancel && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-muted-foreground"
          disabled={isPending}
          onClick={() => {
            if (!confirm("ยืนยันยกเลิกการลานี้?")) return;
            run(() => cancelLeaveRequest(leave.id), "ยกเลิกการลาแล้ว");
          }}
        >
          ยกเลิกการลา
        </Button>
      )}
    </div>
  );
}

/** Advance a China shipment: SHIPPED → ARRIVED_TH → RECEIVED (with one-step undo). */
export function ShipmentStatusButtons({
  shipment,
  onChanged,
}: {
  shipment: CalendarShipmentItem;
  onChanged: () => void;
}) {
  const { isPending, run } = useRun(onChanged);
  const set = (status: string, msg: string) =>
    run(() => setChinaShipmentStatus(shipment.id, status), msg);

  return (
    <div className="flex flex-wrap gap-1.5">
      {shipment.status === "SHIPPED" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          disabled={isPending}
          onClick={() => set("ARRIVED_TH", "อัปเดต: ของถึงไทยแล้ว")}
        >
          <Ship className="mr-1 h-3.5 w-3.5" />
          ถึงไทยแล้ว
        </Button>
      )}
      {(shipment.status === "SHIPPED" || shipment.status === "ARRIVED_TH") && (
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          disabled={isPending}
          onClick={() => set("RECEIVED", "อัปเดต: รับเข้าคลังแล้ว")}
        >
          <PackageCheck className="mr-1 h-3.5 w-3.5" />
          รับเข้าคลังแล้ว
        </Button>
      )}
      {(shipment.status === "ARRIVED_TH" || shipment.status === "RECEIVED") && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-muted-foreground"
          disabled={isPending}
          onClick={() =>
            set(
              shipment.status === "RECEIVED" ? "ARRIVED_TH" : "SHIPPED",
              "ย้อนสถานะแล้ว"
            )
          }
        >
          <Undo2 className="mr-1 h-3.5 w-3.5" />
          ย้อนสถานะ
        </Button>
      )}
    </div>
  );
}
