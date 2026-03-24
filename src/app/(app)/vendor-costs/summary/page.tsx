import { getVendorCosts } from "@/data/vendor-costs";
import { getCompanies } from "@/data/companies";
import { getThaiNow } from "@/lib/thai-date";
import { VendorCostSummaryPage } from "@/components/vendor-costs/vendor-cost-summary-page";

export const dynamic = "force-dynamic";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface VendorCostSummaryPageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
}

export default async function VendorCostSummaryRoute({
  searchParams,
}: VendorCostSummaryPageProps) {
  const params = await searchParams;
  const thaiNow = getThaiNow();
  const currentYear = params.year ? parseInt(params.year, 10) : thaiNow.year;
  const currentMonth =
    params.month === "all"
      ? undefined
      : params.month
        ? parseInt(params.month, 10)
        : thaiNow.month;

  const [vendorCosts, companies] = await Promise.all([
    getVendorCosts({
      month: currentMonth,
      year: currentYear,
    }),
    getCompanies(),
  ]);

  // Use the first-created (primary) company
  const company = companies.at(-1);
  const totalCost = vendorCosts.reduce(
    (sum: number, vc: any) => sum + Number(vc.totalCost),
    0
  );

  const buddhistYear = currentYear + 543;
  const periodLabel = currentMonth
    ? `ประจำเดือน ${THAI_MONTHS[currentMonth - 1]} พ.ศ. ${buddhistYear}`
    : `ประจำปี พ.ศ. ${buddhistYear}`;

  const filename = currentMonth
    ? `สรุปต้นทุนใบสั่งซื้อ-${THAI_MONTHS[currentMonth - 1]}-${buddhistYear}`
    : `สรุปต้นทุนใบสั่งซื้อ-${buddhistYear}`;

  // Build back href preserving filters
  const backParams = new URLSearchParams();
  if (params.month) backParams.set("month", params.month);
  if (params.year) backParams.set("year", params.year);
  const backHref = `/vendor-costs${backParams.toString() ? `?${backParams.toString()}` : ""}`;

  return (
    <VendorCostSummaryPage
      data={{
        vendorCosts: vendorCosts as any,
        totalCost,
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
