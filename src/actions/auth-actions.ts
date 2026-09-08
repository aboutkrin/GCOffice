"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/nav";

const INVALID_CREDENTIALS = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

export async function signIn(formData: { username: string; password: string }) {
  const { username, password } = loginSchema.parse(formData);

  const profile = await prisma.profile.findUnique({
    where: { username },
    select: { email: true, status: true, role: true },
  });
  if (!profile) {
    return { error: INVALID_CREDENTIALS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (error || !data.user) {
    return { error: INVALID_CREDENTIALS };
  }

  if (profile.status === "INACTIVE") {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  redirect(homeFor(profile.role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
