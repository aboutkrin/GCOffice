"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Loader2, Save, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateDeliveryInfo } from "@/actions/stock-document-actions";
import type { DeliveryInfoFormData } from "@/lib/validators";

const FIELDS: { key: keyof DeliveryInfoFormData; label: string; placeholder?: string }[] = [
  { key: "deliveryContactName", label: "ผู้รับหน้างาน" },
  { key: "deliveryContactPhone", label: "เบอร์ผู้รับ" },
  { key: "customerPoNumber", label: "เลขที่ PO ลูกค้า" },
  { key: "vehiclePlate", label: "ทะเบียนรถ", placeholder: "เช่น 1กข 1234" },
  { key: "driverName", label: "ชื่อคนขับ" },
  { key: "driverPhone", label: "เบอร์คนขับ" },
  { key: "carrierName", label: "บริษัทขนส่ง", placeholder: "เว้นว่างถ้าส่งเอง" },
];

type DeliveryDocument = { id: string; status: string; deliveryNumber?: string | null } & {
  [K in keyof DeliveryInfoFormData]?: string | null;
};

function initialValues(document: DeliveryDocument): Required<DeliveryInfoFormData> {
  return {
    deliveryAddress: document.deliveryAddress ?? "",
    deliveryContactName: document.deliveryContactName ?? "",
    deliveryContactPhone: document.deliveryContactPhone ?? "",
    customerPoNumber: document.customerPoNumber ?? "",
    vehiclePlate: document.vehiclePlate ?? "",
    driverName: document.driverName ?? "",
    driverPhone: document.driverPhone ?? "",
    carrierName: document.carrierName ?? "",
    deliveryRemark: document.deliveryRemark ?? "",
  };
}

/** ใบส่งสินค้า details of a delivery round (an ISSUE against a quotation). */
export function DeliveryInfoCard({ document }: { document: DeliveryDocument }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(() => initialValues(document));
  const [dirty, setDirty] = useState(false);
  const isCancelled = document.status === "CANCELLED";
  const isPosted = document.status === "POSTED";

  const set = (key: keyof DeliveryInfoFormData, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  const save = (then?: () => void) => {
    startTransition(async () => {
      try {
        await updateDeliveryInfo(document.id, values);
        setDirty(false);
        router.refresh();
        if (then) then();
        else toast.success("บันทึกข้อมูลการจัดส่งแล้ว");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  const href = `/stock/issue/${document.id}/delivery-note`;
  const openNote = () => {
    if (dirty) save(() => router.push(href));
    else router.push(href);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="size-4" />
          ข้อมูลการจัดส่ง (ใบส่งสินค้า)
          {document.deliveryNumber && (
            <span className="font-mono text-sm font-normal text-muted-foreground">{document.deliveryNumber}</span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          {!isCancelled && (
            <Button type="button" variant="outline" size="sm" onClick={() => save()} disabled={isPending || !dirty}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              บันทึก
            </Button>
          )}
          {dirty ? (
            <Button type="button" size="sm" onClick={openNote} disabled={isPending}>
              <FileText className="size-4" />
              {isPosted ? "พิมพ์ใบส่งสินค้า" : "ดูตัวอย่างใบส่งสินค้า"}
            </Button>
          ) : (
            <Button size="sm" variant={isPosted ? "default" : "outline"} asChild>
              <Link href={href}>
                <FileText className="size-4" />
                {isPosted ? "พิมพ์ใบส่งสินค้า" : "ดูตัวอย่างใบส่งสินค้า"}
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPosted && !isCancelled && (
          <p className="text-xs text-muted-foreground">
            ใส่จำนวนที่ส่งรอบนี้ในรายการด้านล่าง (รายการที่เป็น 0 จะไม่ถูกส่งรอบนี้) แล้วกด &quot;บันทึกและปรับสต็อค&quot;
            — ระบบจะออกเลขใบส่งสินค้า (DN) ให้
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="deliveryAddress">ที่อยู่หน้างาน / สถานที่ส่ง</Label>
          <Textarea
            id="deliveryAddress"
            rows={2}
            value={values.deliveryAddress}
            onChange={(e) => set("deliveryAddress", e.target.value)}
            disabled={isCancelled}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
                disabled={isCancelled}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deliveryRemark">หมายเหตุในใบส่งสินค้า</Label>
          <Textarea
            id="deliveryRemark"
            rows={2}
            value={values.deliveryRemark}
            onChange={(e) => set("deliveryRemark", e.target.value)}
            disabled={isCancelled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
