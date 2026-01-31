"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";

import { holidaySchema, type HolidayFormData } from "@/lib/validators";
import { createHoliday, updateHoliday } from "@/actions/holiday-actions";
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

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      date: initialData?.date ? new Date(initialData.date) : undefined,
      isRecurring: initialData?.isRecurring ?? false,
    },
  });

  function onSubmit(values: HolidayFormData) {
    startTransition(async () => {
      try {
        if (initialData) {
          await updateHoliday(initialData.id, values);
          toast.success("บันทึกวันหยุดเรียบร้อยแล้ว");
        } else {
          await createHoliday(values);
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

            <FormField
              control={form.control}
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
