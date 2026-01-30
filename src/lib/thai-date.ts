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
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const buddhistYear = date.getFullYear() + 543;
  const months = format === "long" ? THAI_MONTHS : THAI_MONTHS_SHORT;
  return `${day} ${months[monthIndex]} ${buddhistYear}`;
}

export function formatThaiDateShort(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = (date.getFullYear() + 543).toString().slice(-2);
  return `${day}/${month}/${year}`;
}

export function toBuddhistYear(date: Date): number {
  return date.getFullYear() + 543;
}
