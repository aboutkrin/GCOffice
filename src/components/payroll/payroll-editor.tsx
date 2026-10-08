"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, FileText, Loader2, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";

import {
  confirmPayroll,
  deletePayroll,
  unconfirmPayroll,
  updatePayroll,
} from "@/actions/payroll-actions";
import type { PayrollLeaveDetail } from "@/lib/payroll";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import {
  LEAVE_PERIOD_LABELS,
  LEAVE_TYPE_LABELS,
  PAYROLL_STATUS_COLORS,
  PAYROLL_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Kind = "EARNING" | "DEDUCTION";

interface EditableItem {
  key: string;
  kind: Kind;
  name: string;
  amount: string;
}

export interface PayrollEditorData {
  id: string;
  status: string;
  year: number;
  month: number;
  employeeName: string;
  monthlySalary: number;
  dailyRate: number;
  hourlyRate: number;
  paidDays: number;
  baseAmount: number;
  leaveHours: number;
  leaveDeduction: number;
  leaveDetails: PayrollLeaveDetail[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  notes: string | null;
  expenseId: string | null;
  items: { kind: string; name: string; amount: number }[];
}

let keySeq = 0;
const newKey = () => `item-${++keySeq}`;

export function PayrollEditor({ data }: { data: PayrollEditorData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDraft = data.status === "DRAFT";

  const [items, setItems] = useState<EditableItem[]>(() =>
    data.items.map((i) => ({
      key: newKey(),
      kind: i.kind as Kind,
      name: i.name,
      amount: String(i.amount),
    }))
  );
  const [notes, setNotes] = useState(data.notes ?? "");

  const sum = (kind: Kind) =>
    items.filter((i) => i.kind === kind).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const earnings = sum("EARNING");
  const deductions = sum("DEDUCTION");
  const net = data.baseAmount - data.leaveDeduction + earnings - deductions;

  const savedItems = JSON.stringify(data.items.map((i) => [i.kind, i.name, Number(i.amount)]));
  const currentItems = JSON.stringify(items.map((i) => [i.kind, i.name.trim(), Number(i.amount) || 0]));
  const dirty = savedItems !== currentItems || (data.notes ?? "") !== notes;

  function run(action: () => Promise<{ error?: string }>, success: string, after?: () => void) {
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(success);
      if (after) after();
      else router.refresh();
    });
  }

  function save(thenConfirm = false) {
    const payload = {
      items: items.map((i) => ({ kind: i.kind, name: i.name, amount: i.amount })),
      notes,
    };
    run(
      async () => {
        const res = await updatePayroll(data.id, payload);
        if (res.error || !thenConfirm) return res;
        return confirmPayroll(data.id);
      },
      thenConfirm ? "ยืนยันสลิปและบันทึกเป็นค่าใช้จ่ายแล้ว" : "บันทึกและคำนวณใหม่เรียบร้อยแล้ว"
    );
  }

  const updateItem = (key: string, patch: Partial<EditableItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const itemSection = (kind: Kind, title: string, placeholder: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        {isDraft && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { key: newKey(), kind, name: "", amount: "" }])}
          >
            <Plus className="size-4" />
            เพิ่มรายการ
          </Button>
        )}
      </div>
      {items.filter((i) => i.kind === kind).length === 0 && (
        <p className="text-sm text-muted-foreground">ไม่มีรายการ</p>
      )}
      {items
        .filter((i) => i.kind === kind)
        .map((item) => (
          <div key={item.key} className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={item.name}
              disabled={!isDraft}
              onChange={(e) => updateItem(item.key, { name: e.target.value })}
            />
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="จำนวนเงิน"
              className="w-32 sm:w-40 text-right"
              value={item.amount}
              disabled={!isDraft}
              onChange={(e) => updateItem(item.key, { amount: e.target.value })}
            />
            {isDraft && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
              >
                <Trash2 className="size-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("border-0", PAYROLL_STATUS_COLORS[data.status])}>
          {PAYROLL_STATUS_LABELS[data.status]}
        </Badge>
        {data.status === "CONFIRMED" && (
          <span className="text-sm text-muted-foreground">
            {data.expenseId
              ? "บันทึกเป็นค่าใช้จ่ายหมวด \"เงินเดือนพนักงาน\" แล้ว"
              : "รายการค่าใช้จ่ายถูกลบไปแล้ว — ยกเลิกการยืนยันแล้วยืนยันใหม่เพื่อบันทึกอีกครั้ง"}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>การคำนวณเงินเดือน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="เงินเดือนเต็มเดือน" value={formatBaht(data.monthlySalary)} />
            <Line label="ค่าแรงต่อวัน (÷ 30)" value={formatBaht(data.dailyRate)} />
            <Line label="ค่าแรงต่อชั่วโมง (÷ 8)" value={formatBaht(data.hourlyRate)} />
            <Line
              label={`เงินเดือนตามวันทำงาน (${data.paidDays} วัน)`}
              value={formatBaht(data.baseAmount)}
              strong
            />
            <Line
              label={`หักลา (${data.leaveHours} ชม.)`}
              value={data.leaveDeduction > 0 ? `-${formatBaht(data.leaveDeduction)}` : "-"}
              className="text-red-600"
            />
            <Line
              label="รายได้อื่น"
              value={earnings > 0 ? `+${formatBaht(earnings)}` : "-"}
              className="text-green-700"
            />
            <Line
              label="รายการหักอื่น"
              value={deductions > 0 ? `-${formatBaht(deductions)}` : "-"}
              className="text-red-600"
            />
            <div className="border-t pt-2">
              <Line label="รับสุทธิ" value={formatBaht(net)} strong />
            </div>
            {isDraft && (
              <p className="text-xs text-muted-foreground pt-2">
                เงินเดือนและวันลาจะคำนวณใหม่จากข้อมูลล่าสุดทุกครั้งที่กดบันทึกหรือยืนยัน
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>วันลาที่หัก ({data.leaveDetails.length} วัน)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.leaveDetails.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีวันลาที่อนุมัติในเดือนนี้</p>
            ) : (
              <div className="space-y-1 text-sm">
                {data.leaveDetails.map((d) => (
                  <div key={d.date} className="flex justify-between gap-2">
                    <span>
                      {formatThaiDate(new Date(d.date))} · {LEAVE_TYPE_LABELS[d.type] ?? d.type} ·{" "}
                      {LEAVE_PERIOD_LABELS[d.period] ?? d.period}
                    </span>
                    <span className="text-red-600 whitespace-nowrap">
                      {d.hours} ชม. (-{formatBaht(d.hours * data.hourlyRate)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายได้ / รายการหักเพิ่มเติม</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {itemSection("EARNING", "รายได้อื่น", "เช่น ค่าล่วงเวลา (OT), โบนัส, เบี้ยขยัน")}
          {itemSection("DEDUCTION", "รายการหักอื่น", "เช่น เบิกล่วงหน้า, มาสาย")}
          <div className="space-y-2">
            <h3 className="font-medium">หมายเหตุ</h3>
            <Textarea
              rows={2}
              value={notes}
              disabled={!isDraft}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/payroll/${data.id}/slip`}>
            <FileText className="size-4" />
            พิมพ์สลิปเงินเดือน
          </Link>
        </Button>
        {isDraft ? (
          <>
            <Button variant="outline" disabled={isPending} onClick={() => save(false)}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : dirty ? <Save className="size-4" /> : <RotateCcw className="size-4" />}
              {dirty ? "บันทึก" : "คำนวณใหม่"}
            </Button>
            <Button disabled={isPending} onClick={() => save(true)}>
              <CheckCircle2 className="size-4" />
              ยืนยันและบันทึกเป็นค่าใช้จ่าย
            </Button>
            <Button
              variant="ghost"
              className="text-red-600"
              disabled={isPending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
              ลบสลิป
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => unconfirmPayroll(data.id), "ยกเลิกการยืนยันและลบรายการค่าใช้จ่ายแล้ว")}
          >
            <Undo2 className="size-4" />
            ยกเลิกการยืนยัน
          </Button>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบสลิปเงินเดือน</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบสลิปเงินเดือนของ {data.employeeName} หรือไม่? รายได้/รายการหักเพิ่มเติมจะถูกลบด้วย
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run(() => deletePayroll(data.id), "ลบสลิปเงินเดือนแล้ว", () =>
                  router.push(`/payroll?year=${data.year}&month=${data.month}`)
                )
              }
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Line({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "font-semibold", className)}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}
