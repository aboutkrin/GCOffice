import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

/**
 * Turn an error thrown inside a Server Action into a Thai message the client can show.
 * Production builds mask thrown error messages, so actions return this as `{ error }`.
 */
export function actionErrorMessage(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
    console.error(err);
    return "ฐานข้อมูลยังไม่มีตารางสำหรับฟีเจอร์นี้ (ยังไม่ได้รัน migration) กรุณาแจ้งผู้ดูแลระบบ";
  }
  if (err instanceof ZodError) {
    return err.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
  }
  console.error(err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }
  return err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
