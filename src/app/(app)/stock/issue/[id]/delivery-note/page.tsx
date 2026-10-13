import { notFound } from "next/navigation";
import { getDeliveryNote } from "@/data/delivery-notes";
import { DeliveryNotePage } from "@/components/delivery-note/delivery-note-page";

export const dynamic = "force-dynamic";

export default async function DeliveryNoteRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDeliveryNote(id);
  if (!data) notFound();

  return <DeliveryNotePage data={data} />;
}
