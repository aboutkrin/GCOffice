"use server";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createUser(data: unknown) {
  await assertAdmin();
  const validated = userCreateSchema.parse(data);

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: validated.email,
    password: validated.password,
    email_confirm: true,
  });

  if (error || !created.user) {
    throw new Error(error?.message ?? "ไม่สามารถสร้างผู้ใช้งานได้");
  }

  try {
    const profile = await prisma.profile.upsert({
      where: { id: created.user.id },
      create: {
        id: created.user.id,
        email: validated.email,
        firstName: validated.firstName,
        lastName: validated.lastName || null,
        role: validated.role,
        status: validated.status,
      },
      update: {
        firstName: validated.firstName,
        lastName: validated.lastName || null,
        role: validated.role,
        status: validated.status,
      },
    });

    revalidatePath("/users");
    return serialize(profile);
  } catch (err) {
    // Roll back the auth user if the profile write failed, so we don't
    // leave an orphaned Supabase account with no corresponding profile.
    await admin.auth.admin.deleteUser(created.user.id);
    throw err;
  }
}

export async function updateUser(id: string, data: unknown) {
  const currentUser = await assertAdmin();
  const validated = userUpdateSchema.parse(data);

  if (currentUser.id === id && (validated.role !== "ADMIN" || validated.status !== "ACTIVE")) {
    throw new Error("ไม่สามารถเปลี่ยนสิทธิ์หรือระงับการใช้งานบัญชีของตัวเองได้");
  }

  if (validated.role !== "ADMIN" || validated.status !== "ACTIVE") {
    const otherActiveAdmins = await prisma.profile.count({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new Error("ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน");
    }
  }

  const user = await prisma.profile.update({
    where: { id },
    data: {
      firstName: validated.firstName,
      lastName: validated.lastName || null,
      role: validated.role,
      status: validated.status,
    },
  });

  if (validated.password) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, { password: validated.password });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/users");
  return serialize(user);
}

export async function deleteUser(id: string) {
  const currentUser = await assertAdmin();

  if (currentUser.id === id) {
    throw new Error("ไม่สามารถลบบัญชีของตัวเองได้");
  }

  const target = await prisma.profile.findUnique({ where: { id } });
  if (!target) {
    throw new Error("ไม่พบผู้ใช้งานนี้");
  }

  if (target.role === "ADMIN" && target.status === "ACTIVE") {
    const otherActiveAdmins = await prisma.profile.count({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new Error("ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน");
    }
  }

  const documentCount = await prisma.document.count({ where: { createdById: id } });
  if (documentCount > 0) {
    throw new Error("ผู้ใช้นี้มีเอกสารในระบบ กรุณาปิดการใช้งานแทนการลบ");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  await prisma.profile.delete({ where: { id } });

  revalidatePath("/users");
}
