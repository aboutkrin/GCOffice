import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_UPLOAD_BYTES,
  extensionForMimeType,
  resolveImageMimeType,
} from "@/lib/image-formats";
import {
  UPLOAD_ERROR_MESSAGES,
  type UploadErrorCode,
  mapStorageError,
} from "@/lib/upload-errors";

/** Buckets the client may write to (uploads run with the service-role key). */
const ALLOWED_BUCKETS = [
  "product-images",
  "company-logos",
  "signatures",
] as const;

type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

/** Folders the client may write into, so the path stays under our control. */
const ALLOWED_FOLDERS = new Set([
  "uploads",
  "products",
  "product-variants",
  "logos",
  "bank-logos",
  "promptpay-qr",
  "shop-logos",
]);

function fail(code: UploadErrorCode, status: number) {
  return NextResponse.json(
    { error: UPLOAD_ERROR_MESSAGES[code], code },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    // Authenticate using the user's session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return fail("UNAUTHENTICATED", 401);
    }

    // Read form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const requestedBucket = (formData.get("bucket") as string) || "product-images";
    const requestedFolder = (formData.get("folder") as string) || "uploads";

    if (!file || file.size === 0) {
      return fail("NO_FILE", 400);
    }

    if (!ALLOWED_BUCKETS.includes(requestedBucket as AllowedBucket)) {
      return fail("INVALID_TYPE", 400);
    }
    const bucket = requestedBucket as AllowedBucket;
    const folder = ALLOWED_FOLDERS.has(requestedFolder)
      ? requestedFolder
      : "uploads";

    if (file.size > MAX_UPLOAD_BYTES) {
      return fail("TOO_LARGE", 413);
    }

    // Resolve the real content type — browsers report "" for HEIC files
    const contentType = resolveImageMimeType(file.name, file.type);
    if (!contentType) {
      return fail("INVALID_TYPE", 400);
    }

    // Generate unique filename from the resolved type, not the user's filename
    const uniqueName = `${crypto.randomUUID()}.${extensionForMimeType(contentType)}`;
    const path = `${folder}/${uniqueName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload using the admin client to bypass storage RLS
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
      });

    if (uploadError) {
      // Log the raw English message; the user only sees the Thai one.
      console.error("Upload error:", uploadError);
      const code = mapStorageError(uploadError);
      return fail(code, code === "TOO_LARGE" ? 413 : 500);
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path,
      bucket,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return fail("UNKNOWN", 500);
  }
}
