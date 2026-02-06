const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function formatThaiDate(date: Date, format: "long" | "short" = "long"): string {
  // Use UTC methods to avoid timezone shifts when displaying date-only values
  const day = date.getUTCDate();
  const monthIndex = date.getUTCMonth();
  const buddhistYear = date.getUTCFullYear() + 543;
  const months = format === "long" ? THAI_MONTHS : THAI_MONTHS_SHORT;
  return `${day} ${months[monthIndex]} ${buddhistYear}`;
}

export function formatThaiDateShort(date: Date): string {
  // Use UTC methods to avoid timezone shifts when displaying date-only values
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = (date.getUTCFullYear() + 543).toString().slice(-2);
  return `${day}/${month}/${year}`;
}

export function formatThaiDateTime(date: Date): string {
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const buddhistYear = date.getFullYear() + 543;
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day} ${THAI_MONTHS_SHORT[monthIndex]} ${buddhistYear} ${hours}:${minutes}`;
}

export function toBuddhistYear(date: Date): number {
  return date.getFullYear() + 543;
}

/**
 * Get the current year and month (1-12) in Thai timezone (Asia/Bangkok, UTC+7).
 * Works correctly on both server (UTC) and client (any timezone).
 */
export function getThaiNow(): { year: number; month: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
  });
  const parts = formatter.formatToParts(new Date());
  return {
    year: parseInt(parts.find((p) => p.type === "year")!.value, 10),
    month: parseInt(parts.find((p) => p.type === "month")!.value, 10),
  };
}

/**
 * Normalize a local-timezone Date to UTC noon, preserving the calendar date.
 * Prevents timezone offsets (e.g. Bangkok UTC+7) from shifting the date
 * when stored in PostgreSQL DATE columns or displayed with UTC methods.
 *
 * Example: April 6 00:00 Bangkok (= April 5 17:00 UTC) → April 6 12:00 UTC
 */
export function toUTCNoon(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  );
}
