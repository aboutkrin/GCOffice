import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DocumentStatus } from "@/generated/prisma/client";
import {
  deductStockForDocument,
  restoreStockForDocument,
  type StockShortage,
} from "@/actions/stock-actions";
import { revalidatePath } from "next/cache";

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

const STOCK_DEDUCTED_STATUSES: DocumentStatus[] = [
  DocumentStatus.CONFIRMED,
  DocumentStatus.SHIPPED,
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

    // Get current document status before updating
    const currentDocument = await prisma.document.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    const oldStatus = currentDocument.status;
    const newStatus = status as DocumentStatus;

    // Update document status
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { status: newStatus },
    });

    // Stock deduction/restore logic
    let shortages: StockShortage[] = [];

    const wasDeducted = STOCK_DEDUCTED_STATUSES.includes(oldStatus);
    const shouldDeduct = newStatus === DocumentStatus.CONFIRMED && !wasDeducted;
    const shouldRestore =
      newStatus === DocumentStatus.CANCELLED && wasDeducted;

    if (shouldDeduct) {
      const result = await deductStockForDocument(id);
      shortages = result.shortages;
    } else if (shouldRestore) {
      await restoreStockForDocument(id);
    }

    if (shouldDeduct || shouldRestore) {
      revalidatePath("/stock");
    }

    return NextResponse.json({ ...updatedDocument, shortages });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะได้" },
      { status: 500 }
    );
  }
}
