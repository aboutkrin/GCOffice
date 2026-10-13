import { PageHeader } from "@/components/layout/page-header";
import { DeliveryNoteTable } from "@/components/delivery-note/delivery-note-table";
import { getDeliveryNotes } from "@/data/delivery-notes";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

interface DeliveryNotesPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function DeliveryNotesPage({ searchParams }: DeliveryNotesPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { notes, total } = await getDeliveryNotes({ search: params.search, page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <PageHeader
        title="ใบส่งสินค้า"
        description="ใบส่งสินค้าทุกรอบที่ออกจากใบเสนอราคา — เริ่มรอบส่งใหม่ได้จากการ์ด “การส่งสินค้า” ในใบเสนอราคาที่ยืนยันแล้ว"
      />

      <DeliveryNoteTable
        notes={notes}
        total={total}
        page={page}
        perPage={PER_PAGE}
        totalPages={totalPages}
        search={params.search ?? ""}
      />
    </div>
  );
}
