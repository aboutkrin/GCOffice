/**
 * Thai-language error messages for the image upload pipeline.
 *
 * Every failure — client-side conversion, validation, network, or Supabase
 * storage — is reduced to one of these codes so the user always sees a plain
 * Thai sentence instead of an English library message or an HTTP status code.
 * Raw English messages are logged on the server only.
 */

export type UploadErrorCode =
  | "UNAUTHENTICATED"
  | "NO_FILE"
  | "INVALID_TYPE"
  | "TOO_LARGE"
  | "CONVERT_FAILED"
  | "NETWORK"
  | "STORAGE"
  | "UNKNOWN";

export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  UNAUTHENTICATED: "กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ",
  NO_FILE: "ไม่พบไฟล์ที่เลือก กรุณาเลือกไฟล์อีกครั้ง",
  INVALID_TYPE:
    "ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ (รองรับ JPG, PNG, WebP, GIF และ HEIC จาก iPhone)",
  TOO_LARGE: "ไฟล์มีขนาดใหญ่เกินไป กรุณาใช้รูปที่มีขนาดไม่เกิน 10 MB",
  CONVERT_FAILED:
    "ไม่สามารถแปลงรูปภาพจาก iPhone ได้ กรุณาบันทึกรูปเป็น JPG แล้วลองใหม่อีกครั้ง",
  NETWORK: "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
  STORAGE: "ไม่สามารถบันทึกไฟล์ลงระบบได้ กรุณาลองใหม่อีกครั้ง",
  UNKNOWN: "เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่อีกครั้ง",
};

/** An error whose `message` is already the Thai text for `code`. */
export class UploadError extends Error {
  readonly code: UploadErrorCode;

  constructor(code: UploadErrorCode) {
    super(UPLOAD_ERROR_MESSAGES[code]);
    this.name = "UploadError";
    this.code = code;
  }
}

/** Thai text for any thrown value — falls back to the generic message. */
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof UploadError) return error.message;
  return UPLOAD_ERROR_MESSAGES.UNKNOWN;
}

/**
 * Map a Supabase `StorageApiError` (English) onto an upload error code.
 * The original message is never shown to the user.
 */
export function mapStorageError(error: unknown): UploadErrorCode {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : "";
  const status =
    error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : undefined;

  if (status === 413 || message.includes("maximum allowed size")) {
    return "TOO_LARGE";
  }
  if (message.includes("mime type") || message.includes("not supported")) {
    return "INVALID_TYPE";
  }
  if (status === 401 || status === 403) {
    return "UNAUTHENTICATED";
  }
  return "STORAGE";
}
