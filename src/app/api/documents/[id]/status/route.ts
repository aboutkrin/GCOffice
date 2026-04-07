import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DocumentStatus } from "@/generated/prisma/client";
import { updateDocumentStatus } from "@/actions/document-actions";

const VALID_STATUSES: string[] = [
  DocumentStatus.DRAFT,
  DocumentStatus.QUOTED,
  DocumentStatus.CONFIRMED,
  DocumentStatus.SHIPPED,
  DocumentStatus.BILLED,
  DocumentStatus.PAID,
  DocumentStatus.DEPOSITED,
  DocumentStatus.CANCELLED,
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    // Parse body
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "สถานะไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const result = await updateDocumentStatus(id, status as DocumentStatus);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะได้" },
      { status: 500 }
    );
  }
}
