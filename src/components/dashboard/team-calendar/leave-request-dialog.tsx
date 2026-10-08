"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { leaveRequestSchema, type LeaveRequestFormData } from "@/lib/validators";
import {
  createLeaveRequest,
  fetchLeaveBalanceAction,
  updateLeaveRequest,
} from "@/actions/leave-actions";
import { formatLeaveHours, leaveRequestHours, type LeaveHolidayInput } from "@/lib/leave-policy";
import { formatThaiDate, toUTCNoon } from "@/lib/thai-date";
import type { LeaveBalanceSummary } from "@/data/leave-balances";
import {
  LEAVE_PERIOD_LABELS,
  LEAVE_PERIOD_OPTIONS,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_OPTIONS,
} from "@/lib/constants";
import type { CalendarLeaveItem, TeamMemberOption } from "@/data/team-calendar";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePickerButton } from "./date-picker-button";

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  currentUserId: string;
  members: TeamMemberOption[];
  /** Existing leave to edit; otherwise a new request starting on defaultDate. */
  leave?: CalendarLeaveItem | null;
  defaultDate?: Date;
  onSaved: () => void;
}

function buildDefaults(
  leave: CalendarLeaveItem | null | undefined,
  defaultDate: Date | undefined,
  currentUserId: string
): LeaveRequestFormData {
  if (leave) {
    return {
      profileId: leave.profileId,
      type: leave.type as LeaveRequestFormData["type"],
      startDate: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      period: leave.period as LeaveRequestFormData["period"],
      reason: leave.reason ?? "",
    };
  }
  return {
    profileId: currentUserId,
    type: "ANNUAL",
    startDate: defaultDate as Date,
    endDate: defaultDate as Date,
    period: "FULL_DAY",
    reason: "",
  };
}

export function LeaveRequestDialog({
  open,
  onOpenChange,
  isAdmin,
  currentUserId,
  members,
  leave,
  defaultDate,
  onSaved,
}: LeaveRequestDialogProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<LeaveRequestFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(leaveRequestSchema) as any,
    defaultValues: buildDefaults(leave, defaultDate, currentUserId),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(leave, defaultDate, currentUserId));
  }, [open, leave, defaultDate, currentUserId, form]);

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const isSingleDay =
    !!startDate && !!endDate && startDate.toDateString() === endDate.toDateString();
  const type = form.watch("type");
  const period = form.watch("period");
  const profileId = form.watch("profileId");

  function onSubmit(values: LeaveRequestFormData) {
    startTransition(async () => {
      try {
        if (leave) {
          const result = await updateLeaveRequest(leave.id, values);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("แก้ไขการลาเรียบร้อยแล้ว");
        } else {
          const result = await createLeaveRequest(values);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            isAdmin ? "บันทึกวันลาเรียบร้อยแล้ว" : "ส่งคำขอลาแล้ว รอแอดมินอนุมัติ"
          );
        }
        onOpenChange(false);
        onSaved();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{leave ? "แก้ไขการลา" : isAdmin ? "เพิ่มวันลา" : "ขอลา"}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "วันลาที่แอดมินบันทึกจะอนุมัติทันที"
              : "คำขอลาจะแสดงในปฏิทินเป็น \"รออนุมัติ\" จนกว่าแอดมินจะอนุมัติ"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isAdmin && (
              <FormField
                control={form.control}
                name="profileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>พนักงาน</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกพนักงาน" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทการลา</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAVE_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {LEAVE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {open && (
              <LeaveBalanceHint
                profileId={isAdmin ? profileId : currentUserId}
                type={type}
                period={period}
                startDate={startDate}
                endDate={endDate}
                editing={leave}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ตั้งแต่วันที่</FormLabel>
                    <DatePickerButton
                      value={field.value}
                      onChange={(date) => {
                        field.onChange(date);
                        const end = form.getValues("endDate");
                        if (date && (!end || end < date)) {
                          form.setValue("endDate", date, { shouldValidate: true });
                        }
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ถึงวันที่</FormLabel>
                    <DatePickerButton value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ช่วงเวลา</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {LEAVE_PERIOD_OPTIONS.map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant={field.value === p ? "default" : "outline"}
                        disabled={p !== "FULL_DAY" && !isSingleDay}
                        onClick={() => field.onChange(p)}
                      >
                        {LEAVE_PERIOD_LABELS[p]}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เหตุผล (ไม่บังคับ)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="เช่น ไปต่างจังหวัด" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {leave ? "บันทึก" : isAdmin ? "บันทึกวันลา" : "ส่งคำขอลา"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type BalanceData = { summary: LeaveBalanceSummary; holidays: LeaveHolidayInput[] };

/** Remaining quota of the chosen type, and a warning when this request goes beyond it. */
function LeaveBalanceHint({
  profileId,
  type,
  period,
  startDate,
  endDate,
  editing,
}: {
  profileId: string | undefined;
  type: string;
  period: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  editing: CalendarLeaveItem | null | undefined;
}) {
  const year = (startDate ?? new Date()).getFullYear();
  const key = `${profileId ?? ""}:${year}`;
  const [loaded, setLoaded] = useState<{ key: string; data: BalanceData } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaveBalanceAction(profileId, year)
      .then((data) => {
        if (!cancelled) setLoaded({ key, data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileId, year, key]);

  const data = loaded?.key === key ? loaded.data : null;
  if (!data || !startDate || !endDate || endDate < startDate) return null;

  const balance = data.summary.balances[type];
  if (!balance) return null;

  // Picker dates are local midnight; quota math reads UTC calendar dates
  const requestHours = leaveRequestHours(
    { type, period, startDate: toUTCNoon(startDate), endDate: toUTCNoon(endDate) },
    data.holidays
  );
  // An edited request is already counted in used/pending — take it out first
  let ownHours = 0;
  if (editing && editing.type === type && (editing.status === "APPROVED" || editing.status === "PENDING")) {
    ownHours = leaveRequestHours(
      { type, period: editing.period, startDate: editing.startDate, endDate: editing.endDate },
      data.holidays
    );
  }
  const pending = data.summary.pendingHours[type] - (editing?.status === "PENDING" ? ownHours : 0);
  const used = balance.usedHours - (editing?.status === "APPROVED" ? ownHours : 0);
  const paidUsed = Math.min(used, balance.paidQuotaHours ?? Infinity);
  const paidLeft =
    balance.paidQuotaHours === null ? Infinity : Math.max(0, balance.paidQuotaHours - paidUsed - pending);
  const remaining =
    balance.remainingHours === null
      ? null
      : Math.max(0, balance.remainingHours + (editing?.status === "APPROVED" ? ownHours : 0) - pending);
  const unpaid = Math.max(0, requestHours - paidLeft);

  const eligibleFrom = data.summary.annualEligibleFrom;
  const notEligible = type === "ANNUAL" && eligibleFrom && toUTCNoon(startDate) < new Date(eligibleFrom);

  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
      <div>
        {LEAVE_TYPE_LABELS[type]}: {remaining === null ? "ไม่จำกัดจำนวน" : `คงเหลือ ${formatLeaveHours(remaining)}`}
        {pending > 0 && <span className="text-muted-foreground"> (หักคำขอที่รออนุมัติแล้ว)</span>}
      </div>
      {requestHours > 0 && <div className="text-muted-foreground">คำขอนี้ {formatLeaveHours(requestHours)}</div>}
      {notEligible ? (
        <div className="text-red-600">
          ยังไม่ได้สิทธิ์ลาพักร้อน (ได้สิทธิ์ {formatThaiDate(new Date(eligibleFrom))}) — จะถูกหักเงินเดือน
        </div>
      ) : (
        unpaid > 0 && (
          <div className="text-red-600">
            {balance.paidQuotaHours === 0
              ? "การลาประเภทนี้ไม่ได้รับค่าจ้าง — จะถูกหักเงินเดือน"
              : `เกินสิทธิ์ที่ได้รับค่าจ้าง ${formatLeaveHours(unpaid)} — ส่วนนี้จะถูกหักเงินเดือน`}
          </div>
        )
      )}
      {type === "SICK" && requestHours >= 24 && (
        <div className="text-amber-700">ลาป่วยตั้งแต่ 3 วันทำงานขึ้นไป กรุณาเตรียมใบรับรองแพทย์</div>
      )}
    </div>
  );
}
