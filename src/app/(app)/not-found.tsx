import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="mt-4 text-lg text-muted-foreground">
        ไม่พบหน้าที่คุณต้องการ
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">กลับหน้าหลัก</Link>
      </Button>
    </div>
  );
}
