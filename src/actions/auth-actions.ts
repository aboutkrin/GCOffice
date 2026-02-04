"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData: { username: string; password: string }) {
  const supabase = await createClient();
  // Convert username to email format for Supabase Auth
  const email = `${formData.username}@gcoffice.local`;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.password,
  });

  if (error) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
