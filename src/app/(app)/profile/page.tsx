import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfileById } from "@/data/profiles";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileById(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ตั้งค่าโปรไฟล์</h1>
        <p className="text-muted-foreground">
          จัดการข้อมูลส่วนตัวและลายเซ็นสำหรับเอกสาร
        </p>
      </div>

      <ProfileForm
        initialData={
          profile
            ? {
                firstName: profile.firstName ?? "",
                lastName: profile.lastName ?? "",
                signatureUrl: profile.signatureUrl ?? "",
              }
            : undefined
        }
      />
    </div>
  );
}
