"use server";

import { prisma } from "@/lib/prisma";
import { chinaShipmentSchema } from "@/lib/validators";
import { toUTCNoon } from "@/lib/thai-date";
import { assertAdmin, requireUserAction } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const SHIPMENT_STATUSES = ["SHIPPED", "ARRIVED_TH", "RECEIVED", "CANCELLED"] as const;
type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Today's calendar date in Bangkok, stored as UTC noon like every other DATE column. */
function thaiToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function shipmentData(validated: ReturnType<typeof chinaShipmentSchema.parse>) {
  return {
    title: validated.title.trim(),
    containerNo: validated.containerNo?.trim() || null,
    supplier: validated.supplier?.trim() || null,
    shippedDate: toUTCNoon(validated.shippedDate),
    etaDate: validated.etaDate ? toUTCNoon(validated.etaDate) : null,
    note: validated.note?.trim() || null,
  };
}

export async function createChinaShipment(data: unknown) {
  const user = await requireUserAction();
  const validated = chinaShipmentSchema.parse(data);
  await prisma.chinaShipment.create({
    data: { ...shipmentData(validated), createdById: user.id },
  });
  revalidatePath("/dashboard");
}

export async function updateChinaShipment(id: string, data: unknown) {
  await requireUserAction();
  const validated = chinaShipmentSchema.parse(data);
  await prisma.chinaShipment.update({
    where: { id },
    data: shipmentData(validated),
  });
  revalidatePath("/dashboard");
}

/**
 * Move a shipment along SHIPPED → ARRIVED_TH → RECEIVED (or CANCELLED).
 * The milestone date defaults to today when it has not been set yet.
 */
export async function setChinaShipmentStatus(id: string, status: string) {
  await requireUserAction();
  if (!SHIPMENT_STATUSES.includes(status as ShipmentStatus)) {
    throw new Error("สถานะไม่ถูกต้อง");
  }
  const shipment = await prisma.chinaShipment.findUniqueOrThrow({ where: { id } });
  const today = thaiToday();
  const next = status as ShipmentStatus;

  await prisma.chinaShipment.update({
    where: { id },
    data: {
      status: next,
      ...(next === "SHIPPED" ? { arrivedDate: null, receivedDate: null } : {}),
      ...(next === "ARRIVED_TH"
        ? { arrivedDate: shipment.arrivedDate ?? today, receivedDate: null }
        : {}),
      ...(next === "RECEIVED"
        ? {
            arrivedDate: shipment.arrivedDate ?? today,
            receivedDate: shipment.receivedDate ?? today,
          }
        : {}),
    },
  });
  revalidatePath("/dashboard");
}

export async function deleteChinaShipment(id: string) {
  await assertAdmin();
  await prisma.chinaShipment.delete({ where: { id } });
  revalidatePath("/dashboard");
}
