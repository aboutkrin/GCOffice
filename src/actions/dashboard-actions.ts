"use server";

import { getMonthlySales, getYearlyStats, type MonthlySalesResult, type YearlyStats } from "@/data/dashboard";

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
