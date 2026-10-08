"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { leaveRequestSchema, type LeaveRequestFormData } from "@/lib/validators";
import { createLeaveRequest, updateLeaveRequest } from "@/actions/leave-actions";
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
    type: "PERSONAL",
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
