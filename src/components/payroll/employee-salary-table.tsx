"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

import { saveEmployeeSalary } from "@/actions/payroll-actions";
import type { EmployeeSalaryRow } from "@/data/payroll";
import { DEFAULT_ANNUAL_LEAVE_DAYS } from "@/lib/leave-policy";
import { employeeSalarySchema, type EmployeeSalaryFormData } from "@/lib/validators";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const dateInputValue = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function EmployeeSalaryTable({ rows }: { rows: EmployeeSalaryRow[] }) {
  const [editing, setEditing] = useState<EmployeeSalaryRow | null>(null);

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>พนักงาน</TableHead>
              <TableHead className="text-right">เงินเดือน</TableHead>
              <TableHead className="text-right">ค่าแรง/วัน</TableHead>
              <TableHead className="text-right">ค่าแรง/ชม.</TableHead>
              <TableHead>วันเริ่มงาน</TableHead>
              <TableHead>วันสุดท้าย</TableHead>
              <TableHead className="text-right">พักร้อน/ปี</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const daily = row.monthlySalary != null ? row.monthlySalary / 30 : null;
              return (
                <TableRow key={row.profileId}>
                  <TableCell>
                    <div className="font-medium">
                      {row.name}
                      {row.status === "INACTIVE" && (
                        <Badge variant="outline" className="ml-2">ปิดใช้งาน</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.monthlySalary != null ? (
                      formatBaht(row.monthlySalary)
                    ) : (
                      <span className="text-muted-foreground">ยังไม่ตั้งค่า</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{daily != null ? formatBaht(daily) : "-"}</TableCell>
                  <TableCell className="text-right">{daily != null ? formatBaht(daily / 8) : "-"}</TableCell>
                  <TableCell>{row.startDate ? formatThaiDate(new Date(row.startDate), "short") : "-"}</TableCell>
                  <TableCell>{row.endDate ? formatThaiDate(new Date(row.endDate), "short") : "-"}</TableCell>
                  <TableCell className="text-right">
                    {row.annualLeaveDays != null ? `${row.annualLeaveDays} วัน` : "-"}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                      <Pencil className="size-4" />
                      {row.monthlySalary != null ? "แก้ไข" : "ตั้งค่า"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          {editing && (
            <SalaryForm key={editing.profileId} row={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SalaryForm({ row, onDone }: { row: EmployeeSalaryRow; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [endDateUnknown, setEndDateUnknown] = useState(!row.endDate);
  const form = useForm<EmployeeSalaryFormData>({
    resolver: zodResolver(employeeSalarySchema) as unknown as Resolver<EmployeeSalaryFormData>,
    defaultValues: {
      monthlySalary: row.monthlySalary ?? ("" as unknown as number),
      startDate: dateInputValue(row.startDate) as unknown as Date,
      endDate: dateInputValue(row.endDate) as unknown as Date,
      annualLeaveDays: row.annualLeaveDays ?? DEFAULT_ANNUAL_LEAVE_DAYS,
      notes: row.notes ?? "",
    },
  });

  function onSubmit(values: EmployeeSalaryFormData) {
    startTransition(async () => {
      const res = await saveEmployeeSalary(
        row.profileId,
        endDateUnknown ? { ...values, endDate: undefined } : values
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("บันทึกเงินเดือนเรียบร้อยแล้ว");
      onDone();
      router.refresh();
    });
  }

  const dateField = (name: "startDate", label: string, description: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="date"
              value={(field.value as unknown as string) ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>เงินเดือน — {row.name}</DialogTitle>
          <DialogDescription>คิดแบบ 30 วันทุกเดือน: ค่าแรงรายวัน = เงินเดือน ÷ 30</DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>เงินเดือนเต็มเดือน (บาท)</FormLabel>
              <FormControl>
                <Input type="number" inputMode="decimal" min={0} step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {dateField("startDate", "วันเริ่มงาน", "เดือนแรกคิดตามวันที่ทำงานจริง")}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>วันทำงานวันสุดท้าย</FormLabel>
                  <label className="flex items-center gap-2 text-sm font-normal">
                    <Switch
                      checked={endDateUnknown}
                      onCheckedChange={(checked) => {
                        setEndDateUnknown(checked);
                        if (checked) field.onChange("");
                        form.clearErrors("endDate");
                      }}
                    />
                    ไม่ระบุ
                  </label>
                </div>
                <FormControl>
                  <Input
                    type="date"
                    disabled={endDateUnknown}
                    value={endDateUnknown ? "" : ((field.value as unknown as string) ?? "")}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  {endDateUnknown ? "ยังทำงานอยู่ — ยังไม่ทราบวันลาออก" : "เดือนสุดท้ายคิดตามวันที่ทำงานจริง"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="annualLeaveDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>วันลาพักร้อนที่ได้ค่าจ้าง (วัน/ปี)</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" min={0} step={1} {...field} />
              </FormControl>
              <FormDescription>
                กฎหมายกำหนดไม่น้อยกว่า 6 วันทำงาน/ปี ได้สิทธิ์เมื่อทำงานครบ 1 ปีนับจากวันเริ่มงาน
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>หมายเหตุ</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
