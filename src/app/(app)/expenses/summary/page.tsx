import { getExpenses } from "@/data/expenses";
import { getCompanies } from "@/data/companies";
import { getThaiNow } from "@/lib/thai-date";
import { ExpenseSummaryPage } from "@/components/expenses/expense-summary-page";

export const dynamic = "force-dynamic";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface ExpenseSummaryPageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    categoryId?: string;
  }>;
}

export default async function ExpenseSummaryRoute({
  searchParams,
}: ExpenseSummaryPageProps) {
  const params = await searchParams;
  const thaiNow = getThaiNow();
  const currentYear = params.year ? parseInt(params.year, 10) : thaiNow.year;
  const currentMonth =
    params.month === "all"
      ? undefined
      : params.month
        ? parseInt(params.month, 10)
        : thaiNow.month;

  const [expenses, companies] = await Promise.all([
    getExpenses({
      categoryId: params.categoryId,
      month: currentMonth,
      year: currentYear,
    }),
    getCompanies(),
  ]);

  const company = companies[0];
  const totalAmount = expenses.reduce(
    (sum: number, e: any) => sum + Number(e.amount),
    0
  );

  const buddhistYear = currentYear + 543;
  const periodLabel = currentMonth
    ? `ประจำเดือน ${THAI_MONTHS[currentMonth - 1]} พ.ศ. ${buddhistYear}`
    : `ประจำปี พ.ศ. ${buddhistYear}`;

  const filename = currentMonth
    ? `สรุปค่าใช้จ่าย-${THAI_MONTHS[currentMonth - 1]}-${buddhistYear}`
    : `สรุปค่าใช้จ่าย-${buddhistYear}`;

  // Build back href preserving filters
  const backParams = new URLSearchParams();
  if (params.month) backParams.set("month", params.month);
  if (params.year) backParams.set("year", params.year);
  if (params.categoryId) backParams.set("categoryId", params.categoryId);
  const backHref = `/expenses${backParams.toString() ? `?${backParams.toString()}` : ""}`;

  return (
    <ExpenseSummaryPage
      data={{
        expenses,
        totalAmount,
        periodLabel,
        company: company
          ? {
              name: company.name,
              address: company.address,
              logoUrl: company.logoUrl,
              phone: company.phone,
              email: company.email,
            }
          : undefined,
      }}
      filename={filename}
      backHref={backHref}
    />
  );
}
