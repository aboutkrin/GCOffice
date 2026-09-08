import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF";
  status: "ACTIVE" | "INACTIVE";
  fullName: string | null;
};

/**
 * Current logged-in user, joined with their Profile row (role/status).
 * Cached per-request so the Supabase + Prisma round-trip runs once even
 * when multiple layouts/pages/actions call this during the same request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let profile = await prisma.profile.findUnique({ where: { id: authUser.id } });

  // The profiles-sync trigger normally creates this row on signup; self-heal
  // if it's somehow missing so an authenticated user is never stuck with no profile.
  if (!profile) {
    profile = await prisma.profile.create({
      data: { id: authUser.id, email: authUser.email ?? "" },
    });
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    fullName: profile.fullName,
  };
});

/** For Server Components/pages: require a logged-in, active user or redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.status === "INACTIVE") {
    redirect("/login");
  }
  return user;
}

/** For Server Components/pages/layouts: require an ADMIN or redirect away. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard?denied=1");
  }
  return user;
}

/** For Server Actions: require a logged-in, active user or throw (surfaces as a toast). */
export async function requireUserAction(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.status === "INACTIVE") {
    throw new Error("ไม่ได้เข้าสู่ระบบ");
  }
  return user;
}

/** For Server Actions: require an ADMIN or throw (surfaces as a toast). */
export async function assertAdmin(): Promise<SessionUser> {
  const user = await requireUserAction();
  if (user.role !== "ADMIN") {
    throw new Error("คุณไม่มีสิทธิ์ใช้งานส่วนนี้");
  }
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
}
