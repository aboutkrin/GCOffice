import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Calendar, Tag, CreditCard, FileText } from "lucide-react";

import { getExpenseById } from "@/data/expenses";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate } from "@/lib/thai-date";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExpenseDeleteButton } from "@/components/expenses/expense-delete-button";

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { id } = await params;
  const expense = await getExpenseById(id);

  if (!expense) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expenses">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">รายละเอียดค่าใช้จ่าย</h1>
            <p className="text-muted-foreground text-sm">{expense.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/expenses/${id}/edit`}>
              <Pencil className="size-4" />
              แก้ไข
            </Link>
          </Button>
          <ExpenseDeleteButton id={id} name={expense.name} />
        </div>
      </div>

      {/* Detail Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            ข้อมูลค่าใช้จ่าย
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount highlight */}
          <div className="rounded-lg bg-muted/50 p-6 text-center">
            <div className="text-sm text-muted-foreground mb-1">จำนวนเงิน</div>
            <div className="text-3xl font-bold text-green-600">
              {formatBaht(expense.amount)}
            </div>
          </div>

          <Separator />

          {/* Detail rows */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-4" />
                รายการ
              </div>
              <div className="font-medium">{expense.name}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                วันที่
              </div>
              <div className="font-medium">
                {formatThaiDate(new Date(expense.expenseDate), "long")}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="size-4" />
                หมวดหมู่
              </div>
              <div>
                <Badge variant="secondary">
                  {expense.category?.name ?? "-"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="size-4" />
                วิธีการชำระ
              </div>
              <div>
                <Badge variant="outline">
                  {PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? "-"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">หมายเหตุ</div>
                <div className="whitespace-pre-wrap text-sm rounded-lg bg-muted/50 p-4">
                  {expense.notes}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
