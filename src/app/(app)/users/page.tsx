import Link from "next/link";
import { Plus } from "lucide-react";

import { getUsers } from "@/data/users";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserTable } from "@/components/users/user-table";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [users, currentUser] = await Promise.all([getUsers(), getCurrentUser()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ผู้ใช้งาน</h1>
          <p className="text-muted-foreground text-sm">
            จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึง
          </p>
        </div>
        <Button asChild>
          <Link href="/users/new">
            <Plus className="size-4" />
            เพิ่มผู้ใช้งาน
          </Link>
        </Button>
      </div>

      <UserTable users={users} currentUserId={currentUser!.id} />
    </div>
  );
}
