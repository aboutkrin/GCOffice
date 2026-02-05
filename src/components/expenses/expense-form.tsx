"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import {
  expenseSchema,
  type ExpenseFormData,
} from "@/lib/validators";
import {
  createExpense,
  updateExpense,
  createExpenseCategory,
} from "@/actions/expense-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExpenseFormProps {
  initialData?: any;
  categories: any[];
}

export function ExpenseForm({ initialData, categories }: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categoryList, setCategoryList] = useState(categories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      amount: initialData?.amount ? Number(initialData.amount) : 0,
      expenseDate: initialData?.expenseDate
        ? new Date(initialData.expenseDate)
        : new Date(),
      categoryId: initialData?.categoryId ?? "",
      notes: initialData?.notes ?? "",
    },
  });

  function onSubmit(values: ExpenseFormData) {
    startTransition(async () => {
      try {
        if (initialData) {
          await updateExpense(initialData.id, values);
          toast.success("บันทึกค่าใช้จ่ายเรียบร้อยแล้ว");
        } else {
          await createExpense(values);
          toast.success("เพิ่มค่าใช้จ่ายเรียบร้อยแล้ว");
        }
        router.push("/expenses");
      } catch (error: any) {
        toast.error(error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const category = await createExpenseCategory({
        name: newCategoryName.trim(),
      });
      setCategoryList((prev) => [...prev, category]);
      form.setValue("categoryId", category.id);
      setNewCategoryName("");
      setDialogOpen(false);
      toast.success("เพิ่มหมวดหมู่เรียบร้อยแล้ว");
    } catch (error: any) {
      toast.error(error?.message ?? "เกิดข้อผิดพลาด");
    }
  }

  // Format date for input[type="date"]
  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลค่าใช้จ่าย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายการค่าใช้จ่าย</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น ค่ายิงแอด Facebook เดือน ม.ค."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนเงิน (฿)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันที่</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? formatDateForInput(field.value)
                            : ""
                        }
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value + "T12:00:00")
                            : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมวดหมู่</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryList.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="size-4" />
                  เพิ่มหมวดหมู่ใหม่
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เพิ่มหมวดหมู่ค่าใช้จ่าย</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      ชื่อหมวดหมู่
                    </label>
                    <Input
                      className="mt-1"
                      placeholder="เช่น ค่าโฆษณา"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddCategory}
                    className="w-full"
                  >
                    เพิ่มหมวดหมู่
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="หมายเหตุเพิ่มเติม..."
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/expenses")}
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
