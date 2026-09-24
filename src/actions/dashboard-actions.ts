"use server";

import {
  getYearlyStats,
  getMonthlyRevenueAndCost,
  getDeliverySchedule,
  getHolidaysForMonth,
  type YearlyStats,
  type MonthlyRevenueExpenseResult,
  type DeliveryScheduleItem,
  type HolidayItem,
} from "@/data/dashboard";
import { assertAdmin } from "@/lib/auth";

export async function fetchYearlyStatsAction(
  year: number
): Promise<YearlyStats> {
  return getYearlyStats(year);
}

export async function fetchMonthlyRevenueExpenseAction(
  year: number
): Promise<MonthlyRevenueExpenseResult> {
  await assertAdmin();
  return getMonthlyRevenueAndCost(year);
}

export async function fetchDeliveryScheduleAction(
  year: number,
  month: number
): Promise<DeliveryScheduleItem[]> {
  return getDeliverySchedule(year, month);
}

export async function fetchHolidaysForMonthAction(
  year: number,
  month: number
): Promise<HolidayItem[]> {
  return getHolidaysForMonth(year, month);
}

export async function markDocumentShippedAction(
  id: string
): Promise<void> {
  const { updateDocumentStatus } = await import("@/actions/document-actions");
  await updateDocumentStatus(id, "SHIPPED");
}
