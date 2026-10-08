"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth";
import { actionErrorMessage } from "@/lib/action-error";
import { employeeSalarySchema, payrollUpdateSchema } from "@/lib/validators";
import { toUTCNoon, THAI_MONTHS } from "@/lib/thai-date";
import { PAYROLL_EXPENSE_CATEGORY } from "@/lib/constants";
import type { PayrollAdjustment, PayrollCalcResult } from "@/lib/payroll";
import { computePayrollFor } from "@/data/payroll";

type ActionResult = { error?: string };

function revalidatePayroll() {
  revalidatePath("/payroll", "layout");
}

/** Columns written from a calculation result (snapshot of rates + totals). */
function payrollFields(result: PayrollCalcResult, employeeName: string) {
  return {
    employeeName,
    monthlySalary: result.monthlySalary,
    dailyRate: result.dailyRate,
    hourlyRate: result.hourlyRate,
    paidDays: result.paidDays,
    baseAmount: result.baseAmount,
    leaveHours: result.leaveHours,
    leaveDeduction: result.leaveDeduction,
    leaveDetails: result.leaveDetails as object[],
    totalEarnings: result.totalEarnings,
    totalDeductions: result.totalDeductions,
    netPay: result.netPay,
  };
}

function itemsOf(items: { kind: string; name: string; amount: unknown }[]): PayrollAdjustment[] {
  return items.map((i) => ({
    kind: i.kind as PayrollAdjustment["kind"],
    name: i.name,
    amount: Number(i.amount),
  }));
}

async function getDraft(id: string) {
  const payroll = await prisma.payroll.findUniqueOrThrow({
    where: { id },
    include: { items: { orderBy: { sequence: "asc" } } },
  });
  if (payroll.status !== "DRAFT") {
    throw new Error("สลิปนี้ยืนยันแล้ว กรุณายกเลิกการยืนยันก่อนแก้ไข");
  }
  return payroll;
}

async function recompute(profileId: string, year: number, month: number, items: PayrollAdjustment[]) {
  const computed = await computePayrollFor(profileId, year, month, items);
  if (!computed) throw new Error("พนักงานคนนี้ยังไม่ได้ตั้งค่าเงินเดือน");
  return computed;
}

export async function saveEmployeeSalary(profileId: string, data: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    const validated = employeeSalarySchema.parse(data);
    const fields = {
      monthlySalary: validated.monthlySalary,
      startDate: validated.startDate ? toUTCNoon(validated.startDate) : null,
      endDate: validated.endDate ? toUTCNoon(validated.endDate) : null,
      notes: validated.notes?.trim() || null,
    };
    await prisma.employeeSalary.upsert({
      where: { profileId },
      create: { profileId, ...fields },
      update: fields,
    });
    revalidatePayroll();
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

/**
 * Create (or recalculate) DRAFT payslips for every employee with a salary who
 * works in the month. Confirmed payslips are left untouched; manual items are kept.
 */
export async function generatePayrollMonth(
  year: number,
  month: number
): Promise<ActionResult & { count?: number }> {
  try {
    const user = await assertAdmin();
    const [salaries, existing] = await Promise.all([
      prisma.employeeSalary.findMany({
        where: { profile: { status: "ACTIVE" } },
        select: { profileId: true },
      }),
      prisma.payroll.findMany({ where: { year, month }, include: { items: true } }),
    ]);
    const existingByProfile = new Map(existing.map((p) => [p.profileId, p]));
    const profileIds = new Set([
      ...salaries.map((s) => s.profileId),
      ...existing.filter((p) => p.status === "DRAFT").map((p) => p.profileId),
    ]);

    let count = 0;
    for (const profileId of profileIds) {
      const saved = existingByProfile.get(profileId);
      if (saved?.status === "CONFIRMED") continue;
      const computed = await computePayrollFor(profileId, year, month, itemsOf(saved?.items ?? []));
      if (!computed) continue;
      if (!saved && computed.result.paidDays === 0) continue;

      const fields = payrollFields(computed.result, computed.employeeName);
      if (saved) {
        await prisma.payroll.update({ where: { id: saved.id }, data: fields });
      } else {
        await prisma.payroll.create({
          data: { profileId, year, month, createdById: user.id, ...fields },
        });
      }
      count++;
    }
    revalidatePayroll();
    return { count };
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
}

/** Create one employee's DRAFT payslip for the month (or return the existing one). */
export async function createPayroll(
  profileId: string,
  year: number,
  month: number
): Promise<ActionResult & { id?: string }> {
  try {
    const user = await assertAdmin();
    const existing = await prisma.payroll.findUnique({
      where: { profileId_year_month: { profileId, year, month } },
    });
    if (existing) return { id: existing.id };

    const computed = await recompute(profileId, year, month, []);
    const payroll = await prisma.payroll.create({
      data: {
        profileId,
        year,
        month,
        createdById: user.id,
        ...payrollFields(computed.result, computed.employeeName),
      },
    });
    revalidatePayroll();
    return { id: payroll.id };
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
}

/** Save extra earnings/deductions + notes and recalculate from the current salary and leave. */
export async function updatePayroll(id: string, data: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    const validated = payrollUpdateSchema.parse(data);
    const payroll = await getDraft(id);
    const computed = await recompute(payroll.profileId, payroll.year, payroll.month, validated.items);

    await prisma.$transaction([
      prisma.payrollItem.deleteMany({ where: { payrollId: id } }),
      prisma.payroll.update({
        where: { id },
        data: {
          ...payrollFields(computed.result, computed.employeeName),
          notes: validated.notes?.trim() || null,
          items: {
            create: validated.items.map((item, index) => ({ ...item, sequence: index })),
          },
        },
      }),
    ]);
    revalidatePayroll();
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

/** Lock the payslip and post its net pay as an expense in "เงินเดือนพนักงาน". */
export async function confirmPayroll(id: string): Promise<ActionResult> {
  try {
    const user = await assertAdmin();
    const payroll = await getDraft(id);
    const computed = await recompute(
      payroll.profileId,
      payroll.year,
      payroll.month,
      itemsOf(payroll.items)
    );
    const fields = payrollFields(computed.result, computed.employeeName);
    const periodLabel = `${THAI_MONTHS[payroll.month - 1]} ${payroll.year + 543}`;

    await prisma.$transaction(async (tx) => {
      const category = await tx.expenseCategory.upsert({
        where: { name: PAYROLL_EXPENSE_CATEGORY },
        create: { name: PAYROLL_EXPENSE_CATEGORY },
        update: {},
      });
      const expense = await tx.expense.create({
        data: {
          name: `เงินเดือน ${computed.employeeName} ${periodLabel}`,
          amount: fields.netPay,
          expenseDate: new Date(Date.UTC(payroll.year, payroll.month, 0, 12)),
          categoryId: category.id,
          paymentMethod: "TRANSFER",
          notes: "บันทึกอัตโนมัติจากเมนูเงินเดือนพนักงาน",
          createdById: user.id,
        },
      });
      await tx.payroll.update({
        where: { id },
        data: { ...fields, status: "CONFIRMED", confirmedAt: new Date(), expenseId: expense.id },
      });
    });

    revalidatePayroll();
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

/** Back to DRAFT; the posted expense is removed so it can be re-posted on the next confirm. */
export async function unconfirmPayroll(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const payroll = await prisma.payroll.findUniqueOrThrow({ where: { id } });
    if (payroll.status !== "CONFIRMED") return {};

    await prisma.$transaction(async (tx) => {
      await tx.payroll.update({
        where: { id },
        data: { status: "DRAFT", confirmedAt: null, expenseId: null },
      });
      if (payroll.expenseId) {
        await tx.expense.deleteMany({ where: { id: payroll.expenseId } });
      }
    });

    revalidatePayroll();
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}

export async function deletePayroll(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    await getDraft(id);
    await prisma.payroll.delete({ where: { id } });
    revalidatePayroll();
  } catch (err) {
    return { error: actionErrorMessage(err) };
  }
  return {};
}
