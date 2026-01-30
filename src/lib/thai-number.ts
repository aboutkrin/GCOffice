/**
 * Converts a number to Thai Baht text representation.
 *
 * Follows standard Thai financial text conversion rules:
 * - เอ็ด for trailing 1 (except when the number is exactly 1)
 * - ยี่สิบ for 20-29
 * - สิบ (without หนึ่ง) for 10-19
 * - ล้าน grouping for numbers >= 1,000,000
 * - Handles satang (2 decimal places)
 * - Handles negative numbers
 * - Returns "ศูนย์บาทถ้วน" for zero
 */

const THAI_DIGITS = [
  "", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า",
  "หก", "เจ็ด", "แปด", "เก้า",
];

const THAI_POSITIONS = [
  "", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน",
];

/**
 * Converts an integer (0 to 999999) to Thai text.
 * This handles a single group of up to 6 digits (ones through แสน).
 */
function groupToThai(n: number): string {
  if (n === 0) return "";

  let result = "";
  const digits: number[] = [];
  let remaining = n;

  // Extract digits from least significant to most significant
  while (remaining > 0) {
    digits.push(remaining % 10);
    remaining = Math.floor(remaining / 10);
  }

  for (let i = digits.length - 1; i >= 0; i--) {
    const digit = digits[i];

    if (digit === 0) continue;

    if (i === 0 && digit === 1 && digits.length > 1) {
      // Trailing 1 becomes เอ็ด (but not if the number is just "1")
      result += "เอ็ด";
    } else if (i === 1 && digit === 1) {
      // 1 in tens place: just "สิบ" (not "หนึ่งสิบ")
      result += "สิบ";
    } else if (i === 1 && digit === 2) {
      // 2 in tens place: "ยี่สิบ" (not "สองสิบ")
      result += "ยี่สิบ";
    } else {
      result += THAI_DIGITS[digit] + THAI_POSITIONS[i];
    }
  }

  return result;
}

/**
 * Converts a non-negative integer to Thai text, handling ล้าน grouping.
 * Supports numbers from 0 up to billions.
 */
function integerToThai(n: number): string {
  if (n === 0) return "ศูนย์";

  let result = "";
  let remaining = n;

  // Process in groups of 6 digits (each group up to 999,999)
  // Each group is separated by ล้าน
  const groups: number[] = [];

  while (remaining > 0) {
    groups.push(remaining % 1000000);
    remaining = Math.floor(remaining / 1000000);
  }

  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];

    if (group === 0 && i > 0) {
      // Skip empty groups but we still need the ล้าน separator
      // Actually, if group is 0 in a higher position, we skip entirely
      continue;
    }

    if (i > 0) {
      // This group represents millions, so convert and append ล้าน
      result += groupToThai(group);
      // Add ล้าน for each million group level
      for (let j = 0; j < i; j++) {
        result += "ล้าน";
      }
    } else {
      // Lowest group (ones through แสน)
      result += groupToThai(group);
    }
  }

  return result;
}

/**
 * Converts a number (including decimals) to Thai Baht text.
 *
 * @param input - The number to convert (number or numeric string)
 * @returns Thai Baht text representation
 *
 * @example
 * bahtText(0)          // "ศูนย์บาทถ้วน"
 * bahtText(1)          // "หนึ่งบาทถ้วน"
 * bahtText(11)         // "สิบเอ็ดบาทถ้วน"
 * bahtText(21)         // "ยี่สิบเอ็ดบาทถ้วน"
 * bahtText(100.50)     // "หนึ่งร้อยบาทห้าสิบสตางค์"
 * bahtText(1000000)    // "หนึ่งล้านบาทถ้วน"
 * bahtText(2000000.25) // "สองล้านบาทยี่สิบห้าสตางค์"
 * bahtText(-500)       // "ลบห้าร้อยบาทถ้วน"
 */
export function bahtText(input: number | string): string {
  const num = typeof input === "string" ? parseFloat(input) : input;

  if (isNaN(num)) return "";
  if (num === 0) return "ศูนย์บาทถ้วน";

  const negative = num < 0;
  const absNum = Math.abs(num);

  // Split into integer and decimal parts
  // Use rounding to avoid floating point precision issues
  const intPart = Math.floor(absNum);
  const decPart = Math.round((absNum - intPart) * 100);

  let result = negative ? "ลบ" : "";

  if (intPart === 0 && decPart > 0) {
    // Only satang, no baht
    result += groupToThai(decPart) + "สตางค์";
  } else {
    // Has baht part
    result += integerToThai(intPart) + "บาท";

    if (decPart > 0) {
      result += groupToThai(decPart) + "สตางค์";
    } else {
      result += "ถ้วน";
    }
  }

  return result;
}
