"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Loader2, Search, Store, Navigation } from "lucide-react";

import { appointmentSchema, type AppointmentFormData } from "@/lib/validators";
import {
  createAppointment,
  searchCustomersForAppointmentAction,
  updateAppointment,
  type AppointmentCustomerOption,
} from "@/actions/appointment-actions";
import type { AppointmentAttendeeOption, CalendarAppointmentItem } from "@/data/team-calendar";
import { cn } from "@/lib/utils";
import { APPOINTMENT_KIND_LABELS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePickerButton } from "./date-picker-button";
import { TimePickerButton } from "./time-picker-button";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  /** Active users: admins can take any appointment, staff only showroom visits. */
  attendees: AppointmentAttendeeOption[];
  /** Existing appointment to edit; otherwise a new one on defaultDate. */
  appointment?: CalendarAppointmentItem | null;
  defaultDate?: Date;
  onSaved: () => void;
}

function buildDefaults(
  appointment: CalendarAppointmentItem | null | undefined,
  defaultDate: Date | undefined,
  currentUserId: string,
  attendees: AppointmentAttendeeOption[]
): AppointmentFormData {
  if (appointment) {
    return {
      kind: appointment.kind === "SHOWROOM" ? "SHOWROOM" : "VISIT_CUSTOMER",
      companyName: appointment.companyName,
      customerId: appointment.customerId,
      location: appointment.location ?? "",
      mapUrl: appointment.mapUrl ?? "",
      contactName: appointment.contactName ?? "",
      contactPhone: appointment.contactPhone ?? "",
      date: new Date(appointment.date),
      startTime: appointment.startTime,
      endTime: appointment.endTime ?? "",
      note: appointment.note ?? "",
      attendeeId: appointment.attendeeId,
    };
  }
  const admins = attendees.filter((a) => a.role === "ADMIN");
  const isAdminSelf = admins.some((a) => a.id === currentUserId);
  return {
    kind: "VISIT_CUSTOMER",
    companyName: "",
    customerId: null,
    location: "",
    mapUrl: "",
    contactName: "",
    contactPhone: "",
    date: defaultDate as Date,
    startTime: "10:00",
    endTime: "",
    note: "",
    attendeeId: isAdminSelf ? currentUserId : admins[0]?.id ?? "",
  };
}

export function AppointmentDialog({
  open,
  onOpenChange,
  currentUserId,
  attendees,
  appointment,
  defaultDate,
  onSaved,
}: AppointmentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<AppointmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(appointmentSchema) as any,
    defaultValues: buildDefaults(appointment, defaultDate, currentUserId, attendees),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(appointment, defaultDate, currentUserId, attendees));
  }, [open, appointment, defaultDate, currentUserId, attendees, form]);

  const attendeeId = form.watch("attendeeId");
  const kind = form.watch("kind");
  const isShowroom = kind === "SHOWROOM";
  const admins = attendees.filter((a) => a.role === "ADMIN");
  // Staff can only receive customers at the showroom; going out is admin-only.
  const attendeeOptions = isShowroom ? attendees : admins;
  const attendee = attendees.find((a) => a.id === attendeeId);
  const selfBooked = attendeeId === currentUserId;
  // Self-booked or booked for a staff member: confirmed at once, no admin approval.
  const needsConfirmation = !selfBooked && attendee?.role === "ADMIN";
  const attendeeName = attendee?.name;

  // Switching back to "ไปพบลูกค้า" with a staff attendee picked: fall back to an admin.
  useEffect(() => {
    if (isShowroom || !attendeeId) return;
    if (admins.some((a) => a.id === attendeeId)) return;
    const self = admins.find((a) => a.id === currentUserId);
    form.setValue("attendeeId", self?.id ?? admins[0]?.id ?? "", { shouldValidate: true });
  }, [isShowroom, attendeeId, admins, currentUserId, form]);

  function onSubmit(values: AppointmentFormData) {
    startTransition(async () => {
      try {
        if (appointment) {
          const result = await updateAppointment(appointment.id, values);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("แก้ไขนัดพบลูกค้าเรียบร้อยแล้ว");
        } else {
          const result = await createAppointment(values);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            needsConfirmation
              ? `ส่งนัดให้ ${attendeeName ?? "แอดมิน"} แล้ว รอยืนยันว่าว่าง`
              : "บันทึกนัดพบลูกค้าเรียบร้อยแล้ว"
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

  function pickCustomer(c: AppointmentCustomerOption) {
    form.setValue("companyName", c.companyName || c.customerName, { shouldValidate: true });
    form.setValue("customerId", c.id);
    if (!form.getValues("location") && c.address) {
      form.setValue("location", c.address);
    }
    if (!form.getValues("contactName")) {
      form.setValue("contactName", c.contactPerson || (c.companyName ? c.customerName : ""));
    }
    if (!form.getValues("contactPhone") && c.phone) {
      form.setValue("contactPhone", c.phone);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{appointment ? "แก้ไขนัดพบลูกค้า" : "นัดพบลูกค้า"}</DialogTitle>
          <DialogDescription>
            {isShowroom
              ? "ลงให้พนักงานรับนัดหรือรับเอง นัดจะยืนยันทันที · ถ้าลงให้แอดมินคนอื่น จะแสดงเป็น \"รอยืนยัน\" จนกว่าแอดมินจะยืนยันว่าว่าง"
              : "ถ้าคุณเป็นผู้ไปพบเอง นัดจะยืนยันทันที · ถ้าลงให้แอดมินคนอื่น จะแสดงเป็น \"รอยืนยัน\" จนกว่าแอดมินจะยืนยันว่าว่าง"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทนัด</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: "VISIT_CUSTOMER", icon: Navigation },
                          { value: "SHOWROOM", icon: Store },
                        ] as const
                      ).map(({ value, icon: Icon }) => {
                        const active = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            aria-pressed={active}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                              active
                                ? value === "SHOWROOM"
                                  ? "border-violet-300 bg-violet-50 font-medium text-violet-800"
                                  : "border-teal-300 bg-teal-50 font-medium text-teal-800"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {APPOINTMENT_KIND_LABELS[value]}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isShowroom ? "บริษัท / ลูกค้าที่มาชม" : "บริษัท / ลูกค้าที่พบ"}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="เช่น บริษัท ABC จำกัด"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.setValue("customerId", null);
                        }}
                      />
                    </FormControl>
                    {open && <CustomerPicker onPick={pickCustomer} />}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isShowroom && (
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>สถานที่</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="ที่อยู่ / จุดนัดพบ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {!isShowroom && (
            <FormField
              control={form.control}
              name="mapUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ลิงก์ Google Maps (ไม่บังคับ)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      inputMode="url"
                      placeholder="วางลิงก์จากปุ่มแชร์ใน Google Maps"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อผู้ติดต่อ</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น คุณชาลี" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทร</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="08x-xxx-xxxx"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>วันที่นัด</FormLabel>
                  <DatePickerButton value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เวลาเริ่ม</FormLabel>
                    <TimePickerButton value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ถึงเวลา (ไม่บังคับ)</FormLabel>
                    <TimePickerButton
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="ไม่ระบุ"
                      clearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="attendeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isShowroom ? "ผู้รับนัด" : "แอดมินที่ไปพบ"}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isShowroom ? "เลือกผู้รับนัด" : "เลือกแอดมิน"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {attendeeOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                          {a.role === "ADMIN" ? " · แอดมิน" : " · พนักงาน"}
                          {a.id === currentUserId ? " (ฉัน)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isShowroom && (
                    <p className="text-xs text-muted-foreground">
                      {needsConfirmation
                        ? "ลงให้แอดมินคนอื่น ต้องรอแอดมินยืนยันว่าว่าง"
                        : attendee?.role === "STAFF"
                          ? "พนักงานรับนัดได้เลย ไม่ต้องรอแอดมินยืนยัน"
                          : null}
                    </p>
                  )}
                  {admins.length === 0 && (
                    <p className="text-xs text-red-600">ยังไม่มีแอดมินที่ใช้งานอยู่</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ (ไม่บังคับ)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="เช่น เอาตัวอย่างสินค้าไปด้วย" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending || admins.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {appointment ? "บันทึก" : needsConfirmation ? "ส่งให้แอดมินยืนยัน" : "บันทึกนัด"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Search the customer table and hand the picked row back (fills name / address). */
function CustomerPicker({ onPick }: { onPick: (c: AppointmentCustomerOption) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppointmentCustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      searchCustomersForAppointmentAction(query)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="shrink-0" title="เลือกจากรายชื่อลูกค้า">
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(380px,calc(100vw-2rem))] p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput placeholder="ค้นหาลูกค้า..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-64">
            <CommandEmpty>{loading ? "กำลังค้นหา..." : "ไม่พบข้อมูลลูกค้า"}</CommandEmpty>
            <CommandGroup>
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onPick(c);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 size-4 opacity-0")} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{c.companyName || c.customerName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[c.code, c.companyName ? c.customerName : null, c.address]
                        .filter(Boolean)
                        .join(" | ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
