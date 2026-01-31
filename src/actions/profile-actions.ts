"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "กรุณาเข้าสู่ระบบ" };
  }

  const validated = profileSchema.parse(data);

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      firstName: validated.firstName,
      lastName: validated.lastName,
      signatureUrl: validated.signatureUrl || null,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}
