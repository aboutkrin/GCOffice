export interface Holiday {
  date: Date | string;
  isRecurring: boolean;
}

interface CalculateDeliveryDatesParams {
  documentDate: Date;
  daysMin: number | null;
  daysMax: number | null;
  skipWeekends: boolean;
  skipHolidays: boolean;
  holidays: Holiday[];
}

interface DeliveryDateResult {
  deliveryDateStart: Date | null;
  deliveryDateEnd: Date | null;
  productionDaysText: string;
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0;
}

function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const dateMonth = date.getMonth();
  const dateDay = date.getDate();
  const dateYear = date.getFullYear();

  return holidays.some((h) => {
    const hDate = new Date(h.date);
    if (h.isRecurring) {
      return hDate.getMonth() === dateMonth && hDate.getDate() === dateDay;
    }
    return (
      hDate.getFullYear() === dateYear &&
      hDate.getMonth() === dateMonth &&
      hDate.getDate() === dateDay
    );
  });
}

function addBusinessDays(
  startDate: Date,
  days: number,
  skipWeekends: boolean,
  skipHolidays: boolean,
  holidays: Holiday[]
): Date {
  const result = new Date(startDate);
  let added = 0;

  while (added < days) {
    result.setDate(result.getDate() + 1);

    if (skipWeekends && isWeekend(result)) continue;
    if (skipHolidays && isHoliday(result, holidays)) continue;

    added++;
  }

  return result;
}

export function calculateDeliveryDates({
  documentDate,
  daysMin,
  daysMax,
  skipWeekends,
  skipHolidays,
  holidays,
}: CalculateDeliveryDatesParams): DeliveryDateResult {
  if (daysMin == null || daysMin <= 0) {
    return {
      deliveryDateStart: null,
      deliveryDateEnd: null,
      productionDaysText: "",
    };
  }

  const effectiveMax = daysMax != null && daysMax >= daysMin ? daysMax : daysMin;
  const suffix =
    skipWeekends || skipHolidays ? "วันทำการ" : "วัน";

  const deliveryDateStart = addBusinessDays(
    documentDate,
    daysMin,
    skipWeekends,
    skipHolidays,
    holidays
  );

  const deliveryDateEnd = addBusinessDays(
    documentDate,
    effectiveMax,
    skipWeekends,
    skipHolidays,
    holidays
  );

  const productionDaysText =
    daysMin === effectiveMax
      ? `${daysMin} ${suffix}`
      : `${daysMin}-${effectiveMax} ${suffix}`;

  return {
    deliveryDateStart,
    deliveryDateEnd,
    productionDaysText,
  };
}
