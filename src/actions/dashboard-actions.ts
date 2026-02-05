"use server";

import {
  getMonthlySales,
  getYearlyStats,
  getMonthlyRevenueAndCost,
  type MonthlySalesResult,
  type YearlyStats,
  type MonthlyRevenueExpenseResult,
} from "@/data/dashboard";

export async function fetchMonthlySalesAction(
  year: number
): Promise<MonthlySalesResult> {
  return getMonthlySales(year);
}

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
