"use server";

import {
  getYearlyStats,
  getMonthlyRevenueAndCost,
  getDeliverySchedule,
  type YearlyStats,
  type MonthlyRevenueExpenseResult,
  type DeliveryScheduleItem,
} from "@/data/dashboard";

export async function fetchYearlyStatsAction(
  year: number
): Promise<YearlyStats> {
  return getYearlyStats(year);
}

export async function fetchMonthlyRevenueExpenseAction(
  year: number
): Promise<MonthlyRevenueExpenseResult> {
  return getMonthlyRevenueAndCost(year);
}

export async function fetchDeliveryScheduleAction(
  year: number,
  month: number
): Promise<DeliveryScheduleItem[]> {
  return getDeliverySchedule(year, month);
}
