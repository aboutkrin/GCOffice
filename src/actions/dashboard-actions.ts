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
import { getTeamCalendar, type TeamCalendarData } from "@/data/team-calendar";
import { assertAdmin, requireUserAction } from "@/lib/auth";

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
): Promise<{ success: true } | { success: false; error: string }> {
  const { updateDocumentStatus } = await import("@/actions/document-actions");
  const result = await updateDocumentStatus(id, "SHIPPED");
  return result.success ? { success: true } : result;
}

export async function fetchTeamCalendarAction(
  year: number,
  month: number
): Promise<TeamCalendarData> {
  await requireUserAction();
  return getTeamCalendar(year, month);
}
