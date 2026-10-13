import { PageHeader } from "@/components/layout/page-header";
import { IssueSourcePicker } from "@/components/stock/issue-source-picker";
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

  const { notes, total, suggestions } = await getDeliveryNotes({ search: params.search, page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <PageHeader
        title="ใบส่งสินค้า"
        description="ใบส่งสินค้าทุกรอบที่ออกจากใบเสนอราคา — กด “สร้างใบส่งสินค้า” แล้วเลือกใบเสนอราคาที่ยืนยันแล้ว (หรือจากการ์ด “การส่งสินค้า” ในใบเสนอราคา)"
      >
        <IssueSourcePicker mode="delivery" />
      </PageHeader>

      <DeliveryNoteTable
        notes={notes}
        suggestions={suggestions}
        total={total}
        page={page}
        perPage={PER_PAGE}
        totalPages={totalPages}
        search={params.search ?? ""}
      />
    </div>
  );
}
