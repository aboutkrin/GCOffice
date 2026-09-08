"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { userCreateSchema, userUpdateSchema } from "@/lib/validators";
import { createUser, updateUser } from "@/actions/user-actions";
import { USER_ROLE_OPTIONS, USER_ROLE_LABELS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

interface UserFormProps {
  initialData?: any;
  isSelf?: boolean;
}

export function UserForm({ initialData, isSelf }: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!initialData;

  const form = useForm<any>({
    resolver: zodResolver(isEdit ? userUpdateSchema : userCreateSchema) as any,
    defaultValues: {
      email: initialData?.email ?? "",
      username: initialData?.username ?? "",
      password: "",
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      role: initialData?.role ?? "STAFF",
      status: initialData?.status ?? "ACTIVE",
    },
  });

  function onSubmit(values: any) {
    startTransition(async () => {
      try {
        if (isEdit) {
          const { password, ...rest } = values;
          await updateUser(initialData.id, { ...rest, password: password || undefined });
          toast.success("บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว");
        } else {
          await createUser(values);
          toast.success("เพิ่มผู้ใช้งานเรียบร้อยแล้ว");
        }
        router.push("/users");
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
            <CardTitle>ข้อมูลผู้ใช้งาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEdit ? (
              <div>
                <label className="text-sm font-medium">อีเมล</label>
                <Input value={initialData.email} readOnly disabled className="mt-1" />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อผู้ใช้</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEdit ? "รหัสผ่านใหม่ (ไม่บังคับ)" : "รหัสผ่าน"}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEdit ? "เว้นว่างหากไม่ต้องการเปลี่ยน" : "อย่างน้อย 8 ตัวอักษร"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ</FormLabel>
                    <FormControl>
                      <Input placeholder="ชื่อ" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>นามสกุล</FormLabel>
                    <FormControl>
                      <Input placeholder="นามสกุล" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>สิทธิ์การใช้งาน</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSelf}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกสิทธิ์การใช้งาน" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {USER_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSelf && (
                    <p className="text-xs text-muted-foreground">
                      ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>สถานะ</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === "ACTIVE"}
                      onCheckedChange={(checked) => field.onChange(checked ? "ACTIVE" : "INACTIVE")}
                      disabled={isSelf}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/users")}>
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
