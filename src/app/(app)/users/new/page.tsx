import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/users/user-form";

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">เพิ่มผู้ใช้งานใหม่</h1>
          <p className="text-muted-foreground text-sm">
            กรอกข้อมูลผู้ใช้งานด้านล่าง
          </p>
        </div>
      </div>

      <UserForm />
    </div>
  );
}
