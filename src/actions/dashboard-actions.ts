"use server";

import { getMonthlySales, type MonthlySalesResult } from "@/data/dashboard";

export async function fetchMonthlySalesAction(
  year: number
): Promise<MonthlySalesResult> {
  return getMonthlySales(year);
}
