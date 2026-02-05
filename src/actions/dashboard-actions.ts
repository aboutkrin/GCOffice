"use server";

import {
  getYearlyStats,
  getMonthlyRevenueAndCost,
  type YearlyStats,
  type MonthlyRevenueExpenseResult,
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
