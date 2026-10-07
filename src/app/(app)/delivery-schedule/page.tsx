import { PageHeader } from "@/components/layout/page-header";
import { DeliverySchedule } from "@/components/dashboard/delivery-schedule";
import { getDeliverySchedule, getHolidaysForMonth } from "@/data/dashboard";
import { getThaiNow } from "@/lib/thai-date";

export const dynamic = 'force-dynamic';

export default async function DeliverySchedulePage() {
  const { year, month } = getThaiNow();
  const [deliverySchedule, holidays] = await Promise.all([
    getDeliverySchedule(year, month),
    getHolidaysForMonth(year, month),
  ]);

  return (
    <div>
      <PageHeader
        title="กำหนดส่งสินค้า"
        description="ตารางกำหนดส่งสินค้าประจำเดือน"
      />
      <DeliverySchedule
        initialData={deliverySchedule}
        initialYear={year}
        initialMonth={month}
        initialHolidays={holidays}
      />
    </div>
  );
}
