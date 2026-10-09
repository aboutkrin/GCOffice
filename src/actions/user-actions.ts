"use server";

import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { actionErrorMessage } from "@/lib/action-error";

function rethrowUsernameConflict(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
  }
  throw err;
}

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
        username: validated.username,
        firstName: validated.firstName,
        lastName: validated.lastName || null,
        role: validated.role,
        status: validated.status,
      },
      update: {
        username: validated.username,
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
    rethrowUsernameConflict(err);
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

  let user;
  try {
    user = await prisma.profile.update({
      where: { id },
      data: {
        username: validated.username,
        firstName: validated.firstName,
        lastName: validated.lastName || null,
        role: validated.role,
        status: validated.status,
      },
    });
  } catch (err) {
    rethrowUsernameConflict(err);
  }

  if (validated.password) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, { password: validated.password });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/users");
  return serialize(user);
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  try {
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

    // Records that must keep their (required) creator: block instead of losing who made them.
    const [documents, payrolls, chinaShipments, stockDocuments, leavesForOthers] = await Promise.all([
      prisma.document.count({ where: { createdById: id } }),
      prisma.payroll.count({ where: { OR: [{ profileId: id }, { createdById: id }] } }),
      prisma.chinaShipment.count({ where: { createdById: id } }),
      prisma.stockDocument.count({ where: { createdById: id } }),
      prisma.leaveRequest.count({ where: { createdById: id, profileId: { not: id } } }),
    ]);
    if (documents > 0) {
      throw new Error(`ผู้ใช้นี้มีเอกสาร ${documents} รายการในระบบ กรุณาปิดการใช้งานแทนการลบ`);
    }
    if (payrolls > 0) {
      throw new Error("ผู้ใช้นี้มีประวัติเงินเดือนในระบบ กรุณาปิดการใช้งานแทนการลบ");
    }
    if (chinaShipments > 0 || stockDocuments > 0 || leavesForOthers > 0) {
      throw new Error("ผู้ใช้นี้มีรายการสินค้าจากจีน ใบสต็อก หรือการลาของพนักงานอื่นที่บันทึกไว้ กรุณาปิดการใช้งานแทนการลบ");
    }

    // Optional "created by" links are cleared; the user's own leave and salary go with them.
    await prisma.$transaction([
      prisma.customer.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.product.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.expense.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.vendorCost.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.stockMovement.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.importLot.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.stockDocument.updateMany({ where: { postedById: id }, data: { postedById: null } }),
      prisma.leaveRequest.updateMany({ where: { reviewedById: id }, data: { reviewedById: null } }),
      prisma.leaveRequest.deleteMany({ where: { profileId: id } }),
      prisma.profile.delete({ where: { id } }),
    ]);

    // The login account is removed last; an earlier failed attempt may already have removed it.
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error && error.status !== 404) {
      console.error(error);
    }
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }

  revalidatePath("/users");
  return {};
}
