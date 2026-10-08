"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus2, Loader2, ScanText, Ship, Truck } from "lucide-react";

import {
  createImportLot,
  extractProformaInvoiceAction,
  updateImportLot,
} from "@/actions/import-lot-actions";
import { computeLandedCosts, DEFAULT_RATE_PER_KG, normalizeCode } from "@/lib/landed-cost";
import { importLotSchema } from "@/lib/validators";
import { prepareImageFile } from "@/lib/image-file";
import { uploadImage } from "@/lib/upload";
import { uploadErrorMessage } from "@/lib/upload-errors";
import { formatBaht, formatNumber } from "@/lib/thai-currency";
import { CHINA_SHIPMENT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { getImportLotById } from "@/data/import-lots";
import { PiInvoiceCard } from "./pi-invoice-card";
import {
  dateToInput,
  emptyInvoice,
  emptyItem,
  newKey,
  type LotInvoiceState,
} from "./types";

interface ShipmentOption {
  id: string;
  title: string;
  containerNo: string | null;
  status: string;
}

type ImportLotDetail = NonNullable<Awaited<ReturnType<typeof getImportLotById>>>;

interface ImportLotFormProps {
  /** Serialized lot from getImportLotById (edit mode) */
  initialData?: ImportLotDetail;
  shipments: ShipmentOption[];
}

type TransportMode = "TRUCK" | "SEA";

function invoicesFromInitial(initialData?: ImportLotDetail): LotInvoiceState[] {
  if (!initialData?.invoices?.length) return [];
  return initialData.invoices.map((inv) => ({
    key: newKey(),
    supplierName: inv.supplierName ?? "",
    piNumber: inv.piNumber ?? "",
    piDate: dateToInput(inv.piDate),
    imageUrl: inv.imageUrl ?? null,
    statedTotalCny: inv.statedTotalCny != null ? Number(inv.statedTotalCny) : null,
    fees: (Array.isArray(inv.fees) ? (inv.fees as { label?: string; amountCny?: number }[]) : []).map((f) => ({
      key: newKey(),
      label: f.label ?? "",
      amountCny: Number(f.amountCny) || 0,
    })),
    items: inv.items.map((it) =>
      emptyItem({
        supplierCode: it.supplierCode,
        description: it.description ?? "",
        boxes: it.boxes,
        sqm: it.sqm != null ? Number(it.sqm) : null,
        amountCny: Number(it.amountCny),
        weightKg: it.weightKg != null ? Number(it.weightKg) : null,
        match: it.product
          ? {
              productId: it.product.id,
              colorVariantId: it.colorVariant?.id ?? null,
              productName: it.product.name,
              productSku: it.product.sku,
              variantName: it.colorVariant?.name ?? null,
              variantSku: it.colorVariant?.sku ?? null,
              imageUrl: it.colorVariant?.imageUrl || it.product.imageUrl,
              matchedBy: "saved",
            }
          : null,
      })
    ),
  }));
}

export function ImportLotForm({ initialData, shipments }: ImportLotFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string>(initialData?.name ?? "");
  const [orderDate, setOrderDate] = useState<string>(
    dateToInput(initialData?.orderDate) || new Date().toISOString().slice(0, 10)
  );
  const [transportMode, setTransportMode] = useState<TransportMode>(initialData?.transportMode ?? "SEA");
  const [ratePerKg, setRatePerKg] = useState<number>(
    initialData?.ratePerKg != null ? Number(initialData.ratePerKg) : DEFAULT_RATE_PER_KG.SEA
  );
  const [exchangeRate, setExchangeRate] = useState<number>(
    initialData?.exchangeRate != null ? Number(initialData.exchangeRate) : 0
  );
  const [freightOverride, setFreightOverride] = useState<number | null>(
    initialData?.freightOverride != null ? Number(initialData.freightOverride) : null
  );
  const [otherCost, setOtherCost] = useState<number>(Number(initialData?.otherCost ?? 0));
  const [chinaShipmentId, setChinaShipmentId] = useState<string>(initialData?.chinaShipmentId ?? "");
  const [notes, setNotes] = useState<string>(initialData?.notes ?? "");
  const [invoices, setInvoices] = useState<LotInvoiceState[]>(() => invoicesFromInitial(initialData));
  const [readingStage, setReadingStage] = useState<string | null>(null);

  // CNY→THB for new lots (same source as the old purchase-cost form)
  useEffect(() => {
    if (initialData?.exchangeRate) return;
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((d) => {
        if (d.rate > 0) setExchangeRate((cur) => cur || Math.round(d.rate * 10000) / 10000);
      })
      .catch(() => {});
  }, [initialData?.exchangeRate]);

  const landed = useMemo(
    () =>
      computeLandedCosts({
        exchangeRate,
        ratePerKg,
        freightOverride,
        otherCost,
        invoices: invoices.map((inv) => ({
          fees: inv.fees,
          items: inv.items.map((it) => ({ boxes: it.boxes, amountCny: it.amountCny, weightKg: it.weightKg })),
        })),
      }),
    [exchangeRate, ratePerKg, freightOverride, otherCost, invoices]
  );

  const allItems = invoices.flatMap((inv) => inv.items);
  const totalBoxes = allItems.reduce((s, it) => s + (it.boxes || 0), 0);
  const matchedCount = allItems.filter((it) => it.match).length;

  const updateInvoice = (key: string) => (update: (prev: LotInvoiceState) => LotInvoiceState) =>
    setInvoices((prev) => prev.map((inv) => (inv.key === key ? update(inv) : inv)));

  const switchMode = (mode: TransportMode) => {
    setTransportMode(mode);
    setRatePerKg(DEFAULT_RATE_PER_KG[mode]);
  };

  async function handlePiFile(file: File) {
    let imageUrl: string | null = null;
    try {
      setReadingStage("กำลังเตรียมรูป...");
      const prepared = await prepareImageFile(file, undefined, { maxDimension: 3500, maxSizeMB: 4 });
      setReadingStage("กำลังอัปโหลด...");
      imageUrl = await uploadImage("product-images", prepared, "supplier-invoices");
    } catch (error) {
      setReadingStage(null);
      toast.error(uploadErrorMessage(error));
      return;
    }

    setReadingStage("AI กำลังอ่านใบ PI... (ประมาณ 10-40 วินาที)");
    const res = await extractProformaInvoiceAction(imageUrl);
    setReadingStage(null);

    if (!res.success || !res.data) {
      // Keep the image so the PI can be typed in while looking at it
      setInvoices((prev) => [...prev, emptyInvoice({ imageUrl })]);
      toast.error(res.success ? "อ่านใบ PI ไม่สำเร็จ" : res.error);
      return;
    }

    const { pi, matches } = res.data;
    const items = pi.items.map((it) => {
      const m = matches[normalizeCode(it.supplierCode)] ?? null;
      return emptyItem({
        supplierCode: it.supplierCode,
        description: it.description ?? "",
        boxes: it.boxes,
        sqm: it.sqm,
        amountCny: it.amount,
        weightKg: it.weightKg,
        match: m,
        rememberAlias: m?.matchedBy === "name",
      });
    });
    setInvoices((prev) => [
      ...prev,
      emptyInvoice({
        supplierName: pi.supplierName ?? "",
        piNumber: pi.piNumber ?? "",
        piDate: pi.piDate ?? "",
        imageUrl,
        statedTotalCny: pi.totalAmount,
        fees: pi.fees.map((f) => ({ key: newKey(), label: f.label, amountCny: f.amount })),
        items: items.length ? items : [emptyItem()],
      }),
    ]);
    if (!name) {
      setName(pi.supplierName ? `ล็อต ${pi.supplierName}` : "");
    }
    const unmatched = items.filter((it) => !it.match).length;
    toast.success(
      `อ่านได้ ${items.length} รายการ${unmatched ? ` · ยังไม่จับคู่ ${unmatched} รายการ` : ""} กรุณาตรวจทานก่อนบันทึก`
    );
  }

  function handleSubmit() {
    const payload = {
      name,
      orderDate: orderDate ? new Date(orderDate + "T12:00:00") : undefined,
      chinaShipmentId: chinaShipmentId || null,
      transportMode,
      ratePerKg,
      freightOverride,
      otherCost,
      exchangeRate,
      notes,
      invoices: invoices.map((inv) => ({
        supplierName: inv.supplierName,
        piNumber: inv.piNumber || null,
        piDate: inv.piDate ? new Date(inv.piDate + "T12:00:00") : null,
        imageUrl: inv.imageUrl,
        statedTotalCny: inv.statedTotalCny,
        fees: inv.fees
          .filter((f) => f.amountCny)
          .map((f) => ({ label: f.label.trim() || "ค่าใช้จ่าย", amountCny: f.amountCny })),
        items: inv.items
          .filter((it) => it.supplierCode.trim() || it.amountCny || it.boxes)
          .map((it) => ({
            supplierCode: it.supplierCode,
            description: it.description || null,
            boxes: it.boxes,
            sqm: it.sqm,
            amountCny: it.amountCny,
            weightKg: it.weightKg,
            productId: it.match?.productId || null,
            colorVariantId: it.match?.colorVariantId || null,
            rememberAlias: Boolean(it.match) && it.rememberAlias,
          })),
      })),
    };

    const parsed = importLotSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ครบ");
      return;
    }

    startTransition(async () => {
      const res = initialData?.id
        ? await updateImportLot(initialData.id, payload)
        : await createImportLot(payload);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("บันทึกล็อตนำเข้าแล้ว");
      if (!initialData?.id && res.data?.id) {
        router.push(`/import-lots/${res.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Lot */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลล็อต</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">ชื่อล็อต / เลขล็อต</label>
            <Input value={name} placeholder="เช่น ล็อตเรือ ต.ค. 69" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">วันที่สั่งซื้อ</label>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">ส่งจีน → ไทย ทาง</label>
            <div className="grid grid-cols-2 gap-2">
              {(["TRUCK", "SEA"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={transportMode === mode ? "default" : "outline"}
                  onClick={() => switchMode(mode)}
                >
                  {mode === "TRUCK" ? <Truck className="size-4" /> : <Ship className="size-4" />}
                  {mode === "TRUCK" ? "รถ" : "เรือ"}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">ค่าส่ง (฿/กก.)</label>
              <DecimalInput value={ratePerKg || ""} onChange={setRatePerKg} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">เรทเงินหยวน (฿/¥)</label>
              <DecimalInput value={exchangeRate || ""} onChange={setExchangeRate} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">ค่าส่งจริงจากบิลชิปปิ้ง (฿)</label>
            <DecimalInput
              value={freightOverride ?? ""}
              placeholder={`ไม่กรอก = คำนวณจากน้ำหนัก ${formatBaht(landed.freightEstimated)}`}
              onChange={(v) => setFreightOverride(v || null)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">ค่าใช้จ่ายอื่นของล็อต (฿)</label>
            <DecimalInput
              value={otherCost || ""}
              placeholder="เช่น ภาษี, ค่าลงของ"
              onChange={setOtherCost}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">ผูกกับรายการขนส่งจีน (ปฏิทิน)</label>
            <Select value={chinaShipmentId || "none"} onValueChange={(v) => setChinaShipmentId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่ผูก</SelectItem>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                    {s.containerNo ? ` · ${s.containerNo}` : ""} ({CHINA_SHIPMENT_STATUS_LABELS[s.status] ?? s.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">หมายเหตุ</label>
            <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Add PI */}
      <Card className="border-primary/40 border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold">เพิ่มใบ PI จากจีน</p>
            <p className="text-muted-foreground text-sm">
              ถ่ายรูป/แคปหน้าจอใบ PI แล้วให้ AI อ่านรหัส จำนวนกล่อง ยอดเงิน น้ำหนัก และจับคู่สินค้าให้อัตโนมัติ
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handlePiFile(file);
              }}
            />
            <Button type="button" disabled={readingStage != null} onClick={() => fileInputRef.current?.click()}>
              {readingStage ? <Loader2 className="size-4 animate-spin" /> : <ScanText className="size-4" />}
              {readingStage ?? "อ่านใบ PI จากรูป"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={readingStage != null}
              onClick={() => setInvoices((prev) => [...prev, emptyInvoice()])}
            >
              <FilePlus2 className="size-4" />
              กรอกเอง
            </Button>
          </div>
        </CardContent>
      </Card>

      {invoices.map((inv, i) => (
        <PiInvoiceCard
          key={inv.key}
          index={i}
          invoice={inv}
          landed={landed.invoices[i]}
          onChange={updateInvoice(inv.key)}
          onRemove={() => setInvoices((prev) => prev.filter((x) => x.key !== inv.key))}
        />
      ))}

      {/* Summary */}
      <Card className="sticky bottom-2 z-10 shadow-lg">
        <CardContent className="space-y-3 py-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="สินค้า + ค่าใช้จ่ายจีน" value={`¥${formatNumber(landed.totalGoodsCny + landed.totalFeesCny)}`} />
            <Stat label="จำนวน" value={`${totalBoxes.toLocaleString("th-TH")} กล่อง`} />
            <Stat label="น้ำหนักรวม" value={`${formatNumber(landed.totalWeightKg)} กก.`} />
            <Stat
              label={freightOverride ? "ค่าส่งจีน-ไทย (บิลจริง)" : `ค่าส่งจีน-ไทย (${formatNumber(ratePerKg)} ฿/กก.)`}
              value={formatBaht(landed.freight)}
            />
            <Stat
              label="จับคู่สินค้าแล้ว"
              value={`${matchedCount}/${allItems.length}`}
              className={matchedCount < allItems.length ? "text-amber-600" : "text-emerald-600"}
            />
            <Stat label="ต้นทุนถึงไทยรวม" value={formatBaht(landed.totalLanded)} className="text-primary text-base" />
          </div>
          {landed.missingWeight && allItems.length > 0 && (
            <p className="text-xs text-amber-700">
              บางรายการไม่มีน้ำหนัก ระบบจึงเฉลี่ยค่าส่งตามยอดเงินแทน — ใส่น้ำหนักให้ครบเพื่อความแม่นยำ
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/import-lots")}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending || readingStage != null}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              บันทึกล็อต
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("font-semibold tabular-nums", className)}>{value}</p>
    </div>
  );
}
