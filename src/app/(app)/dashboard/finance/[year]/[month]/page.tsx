import { notFound } from "next/navigation";

import { getMonthFinance } from "@/data/finance";
import { requireAdmin } from "@/lib/auth";
import { getThaiNow } from "@/lib/thai-date";
import { MonthFinanceView } from "@/components/finance/month-finance-view";

export const dynamic = "force-dynamic";

export default async function MonthFinancePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  await requireAdmin();
  const { year: yearParam, month: monthParam } = await params;
  const year = Number(yearParam);
  const month = Number(monthParam);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    notFound();
  }

  const data = await getMonthFinance(year, month);
  return <MonthFinanceView data={data} now={getThaiNow()} />;
}
