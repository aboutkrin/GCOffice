"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { profileSchema, type ProfileFormData } from "@/lib/validators";
import { updateProfile } from "@/actions/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";

interface ProfileFormProps {
  initialData?: {
    firstName: string;
    lastName: string;
    signatureUrl: string;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      signatureUrl: initialData?.signatureUrl ?? "",
    },
  });

  function onSubmit(data: ProfileFormData) {
    startTransition(async () => {
      try {
        const result = await updateProfile(data);
        if (result && "error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว");
        router.refresh();
      } catch {
        toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
            <CardDescription>
              ชื่อและนามสกุลจะแสดงในเอกสารที่คุณสร้าง
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อ</FormLabel>
                  <FormControl>
                    <Input placeholder="ชื่อ" {...field} />
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
                    <Input placeholder="นามสกุล" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รูปลายเซ็น</CardTitle>
            <CardDescription>
              อัปโหลดรูปลายเซ็นเพื่อแสดงในเอกสารอัตโนมัติ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="signatureUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      bucket="signatures"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            <Save className="size-4" />
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
