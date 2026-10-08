"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import {
  holidayRangeSchema,
  type HolidayRangeFormData,
} from "@/lib/validators";
import { createHolidayRange, updateHolidayGroup } from "@/actions/holiday-actions";
import { getDayCount, type HolidayGroup } from "@/lib/holiday-groups";
import { formatThaiDate, toUTCNoon } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import { HOLIDAY_TYPE_LABELS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const HOLIDAY_TYPE_OPTIONS = [
  {
    value: "COMPANY",
    dot: "bg-red-400",
    selectedClass: "border-red-300 bg-red-50 ring-1 ring-red-300",
    description: "ออฟฟิศหยุดจริง (แสดงสีแดงบนปฏิทิน)",
  },
  {
    value: "PUBLIC",
    dot: "bg-gray-400",
    selectedClass: "border-gray-300 bg-gray-50 ring-1 ring-gray-300",
    description: "ที่อื่นหยุด แต่ออฟฟิศทำงานปกติ (แสดงสีเทา)",
  },
  {
    value: "CHINA",
    dot: "border border-dashed border-red-500 bg-red-100",
    selectedClass: "border-dashed border-red-400 bg-red-50 ring-1 ring-red-300",
    description: "จีนหยุด ออฟฟิศทำงานปกติ แต่วันส่งของจะเลื่อนออกไป (กรอบแดงเส้นประ)",
  },
] as const;

interface HolidayFormProps {
  /** The multi-day group being edited (all its days are replaced on save) */
  initialData?: HolidayGroup;
}

export function HolidayForm({ initialData }: HolidayFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialRange: DateRange | undefined = initialData
    ? { from: new Date(initialData.startDate), to: new Date(initialData.endDate) }
    : undefined;

  const form = useForm<HolidayRangeFormData>({
    resolver: zodResolver(holidayRangeSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      startDate: initialRange?.from as Date,
      endDate: initialRange?.to as Date,
      isRecurring: initialData?.isRecurring ?? false,
      type: (initialData?.type as HolidayRangeFormData["type"]) ?? "COMPANY",
    },
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialRange);

  function onSubmit(values: HolidayRangeFormData) {
    startTransition(async () => {
      try {
        if (initialData) {
          await updateHolidayGroup(initialData.ids, values);
          toast.success("บันทึกวันหยุดเรียบร้อยแล้ว");
        } else {
          await createHolidayRange(values);
          toast.success("เพิ่มวันหยุดเรียบร้อยแล้ว");
        }
        router.push("/holidays");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลวันหยุด</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อวันหยุด</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น วันสงกรานต์" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

                <FormItem>
                  <FormLabel>ช่วงวันที่</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {formatThaiDate(dateRange.from, "short")} -{" "}
                              {formatThaiDate(dateRange.to, "short")}
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({getDayCount(dateRange.from, dateRange.to)} วัน)
                              </span>
                            </>
                          ) : (
                            formatThaiDate(dateRange.from, "short")
                          )
                        ) : (
                          "เลือกช่วงวันที่"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range) => {
                          const normalized = range
                            ? {
                                from: range.from
                                  ? toUTCNoon(range.from)
                                  : undefined,
                                to: range.to
                                  ? toUTCNoon(range.to)
                                  : undefined,
                              }
                            : undefined;
                          setDateRange(normalized);
                          if (normalized?.from) {
                            form.setValue("startDate", normalized.from, {
                              shouldValidate: true,
                            });
                          }
                          if (normalized?.to) {
                            form.setValue("endDate", normalized.to, {
                              shouldValidate: true,
                            });
                          } else if (normalized?.from) {
                            form.setValue("endDate", normalized.from, {
                              shouldValidate: true,
                            });
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.startDate && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.startDate.message}
                    </p>
                  )}
                  {form.formState.errors.endDate && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.endDate.message}
                    </p>
                  )}
                </FormItem>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทวันหยุด</FormLabel>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {HOLIDAY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          field.value === opt.value
                            ? opt.selectedClass
                            : "hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className={cn("h-2.5 w-2.5 rounded-full", opt.dot)} />
                          {HOLIDAY_TYPE_LABELS[opt.value]}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {opt.description}
                        </div>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>วันหยุดประจำทุกปี</FormLabel>
                    <FormDescription>
                      เปิดใช้งานหากวันหยุดนี้เกิดขึ้นในวันที่เดียวกันทุกปี
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/holidays")}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            บันทึก
          </Button>
        </div>
      </form>
    </Form>
  );
}
