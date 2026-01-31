import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DocumentStatus } from "@/generated/prisma/client";

const VALID_STATUSES: string[] = [
  DocumentStatus.DRAFT,
  DocumentStatus.QUOTED,
  DocumentStatus.CONFIRMED,
  DocumentStatus.SAMPLE,
  DocumentStatus.BILLED,
  DocumentStatus.PAID,
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

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { status: status as DocumentStatus },
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะได้" },
      { status: 500 }
    );
  }
}
