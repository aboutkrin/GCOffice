"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import {
  holidaySchema,
  holidayRangeSchema,
  type HolidayFormData,
  type HolidayRangeFormData,
} from "@/lib/validators";
import { createHolidayRange, updateHoliday } from "@/actions/holiday-actions";
import { formatThaiDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

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

interface HolidayFormProps {
  initialData?: any;
}

export function HolidayForm({ initialData }: HolidayFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!initialData;

  // --- Edit mode: single-date form ---
  const editForm = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      date: initialData?.date ? new Date(initialData.date) : undefined,
      isRecurring: initialData?.isRecurring ?? false,
    },
  });

  // --- Create mode: range form ---
  const createForm = useForm<HolidayRangeFormData>({
    resolver: zodResolver(holidayRangeSchema) as any,
    defaultValues: {
      name: "",
      startDate: undefined as unknown as Date,
      endDate: undefined as unknown as Date,
      isRecurring: false,
    },
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = (isEditing ? editForm : createForm) as any;

  function onSubmit(values: any) {
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateHoliday(initialData.id, values);
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

            {isEditing ? (
              <FormField
                control={editForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? formatThaiDate(field.value, "short")
                              : "เลือกวันที่"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
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
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        if (range?.from) {
                          createForm.setValue("startDate", range.from, {
                            shouldValidate: true,
                          });
                        }
                        if (range?.to) {
                          createForm.setValue("endDate", range.to, {
                            shouldValidate: true,
                          });
                        } else if (range?.from) {
                          createForm.setValue("endDate", range.from, {
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {createForm.formState.errors.startDate && (
                  <p className="text-sm font-medium text-destructive">
                    {createForm.formState.errors.startDate.message}
                  </p>
                )}
                {createForm.formState.errors.endDate && (
                  <p className="text-sm font-medium text-destructive">
                    {createForm.formState.errors.endDate.message}
                  </p>
                )}
              </FormItem>
            )}

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
