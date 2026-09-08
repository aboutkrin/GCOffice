import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getUserById } from "@/data/users";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/users/user-form";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  const [user, currentUser] = await Promise.all([getUserById(id), getCurrentUser()]);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขผู้ใช้งาน</h1>
          <p className="text-muted-foreground text-sm">
            {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email}
          </p>
        </div>
      </div>

      <UserForm initialData={user} isSelf={currentUser?.id === id} />
    </div>
  );
}
