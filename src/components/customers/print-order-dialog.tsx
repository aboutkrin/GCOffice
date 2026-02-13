"use client";

import { useRef, useState } from "react";
import { Printer, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { exportToPdf } from "@/lib/export-pdf";

interface CustomerData {
  customerName: string;
  phone?: string | null;
  address?: string | null;
}

interface PrintOrderDialogProps {
  customer: CustomerData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHOP_INFO = {
  name: "เปมิกา แซ่เล้า",
  address1: "นาคสถาพร 1-1-2 เพชรเกษม 69",
  address2: "เขต หนองแขม แขวง หนองค้างพลู",
  address3: "กรุงเทพฯ 10160",
  phone: "099-413-3264",
  line: "@Good.choice",
  website: "www.goodchoiceth.com",
};

const GREEN = "#2d5a27";

function OrderSlipContent({ customer }: { customer: CustomerData }) {
  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "12mm 15mm",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Sarabun', sans-serif",
        color: "#1a1a1a",
        background: "#fff",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Green border frame */}
      <div
        style={{
          position: "absolute",
          inset: "6mm",
          border: `2px solid ${GREEN}`,
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      />

      {/* Header: Logo + Shop Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "8mm",
          padding: "0 4mm",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg
            viewBox="0 0 24 24"
            width="44"
            height="44"
            fill={GREEN}
          >
            <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
          </svg>
          <div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: GREEN,
                letterSpacing: "3px",
                lineHeight: 1.1,
              }}
            >
              GOOD CHOICE
            </div>
            <div
              style={{
                fontSize: "10px",
                color: GREEN,
                letterSpacing: "1px",
              }}
            >
              กู๊ดช้อยส์
            </div>
          </div>
        </div>

        {/* Shop Address */}
        <div
          style={{
            textAlign: "right",
            fontSize: "13px",
            lineHeight: 1.9,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "15px" }}>
            {SHOP_INFO.name}
          </div>
          <div>{SHOP_INFO.address1}</div>
          <div>{SHOP_INFO.address2}</div>
          <div>{SHOP_INFO.address3}</div>
          <div style={{ fontWeight: 600 }}>Tel: {SHOP_INFO.phone}</div>
        </div>
      </div>

      {/* Customer Info Box */}
      <div
        style={{
          border: `2px solid ${GREEN}`,
          borderRadius: "8px",
          padding: "10mm 12mm",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          margin: "0 4mm",
        }}
      >
        {/* กรุณาส่ง label */}
        <div
          style={{
            fontSize: "20px",
            color: GREEN,
            fontWeight: 600,
            marginBottom: "8mm",
            paddingBottom: "4mm",
            borderBottom: `1px solid ${GREEN}40`,
          }}
        >
          กรุณาส่ง
        </div>

        {/* Customer Name + Phone */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "6mm",
          }}
        >
          <div style={{ fontSize: "22px", fontWeight: 700 }}>
            คุณ {customer.customerName}
          </div>
          {customer.phone && (
            <div style={{ fontSize: "16px", fontWeight: 500 }}>
              Tel: {customer.phone}
            </div>
          )}
        </div>

        {/* Customer Address */}
        {customer.address && (
          <div
            style={{
              fontSize: "16px",
              lineHeight: 2,
              whiteSpace: "pre-wrap",
            }}
          >
            {customer.address}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          background: GREEN,
          color: "white",
          padding: "5mm 12mm",
          borderRadius: "6px",
          marginTop: "6mm",
          textAlign: "center",
          margin: "6mm 4mm 0",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "2px",
            marginBottom: "3mm",
          }}
        >
          CONTACT US
        </div>
        <div
          style={{
            fontSize: "12px",
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <span>{SHOP_INFO.phone}</span>
          <span>|</span>
          <span>{SHOP_INFO.line}</span>
          <span>|</span>
          <span>{SHOP_INFO.website}</span>
        </div>
      </div>
    </div>
  );
}

function generatePrintHTML(customer: CustomerData): string {
  const escape = (str: string | null | undefined) =>
    (str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>ใบสั่งของ - ${escape(customer.customerName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', sans-serif;
      background: #fff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 15mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      position: relative;
      color: #1a1a1a;
    }
    .frame {
      position: absolute;
      inset: 6mm;
      border: 2px solid ${GREEN};
      border-radius: 4px;
      pointer-events: none;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8mm;
      padding: 0 4mm;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-text {
      font-size: 28px;
      font-weight: 700;
      color: ${GREEN};
      letter-spacing: 3px;
      line-height: 1.1;
    }
    .logo-sub {
      font-size: 10px;
      color: ${GREEN};
      letter-spacing: 1px;
    }
    .shop-info {
      text-align: right;
      font-size: 13px;
      line-height: 1.9;
    }
    .shop-name {
      font-weight: 600;
      font-size: 15px;
    }
    .shop-phone {
      font-weight: 600;
    }
    .customer-box {
      border: 2px solid ${GREEN};
      border-radius: 8px;
      padding: 10mm 12mm;
      flex: 1;
      display: flex;
      flex-direction: column;
      margin: 0 4mm;
    }
    .deliver-label {
      font-size: 20px;
      color: ${GREEN};
      font-weight: 600;
      margin-bottom: 8mm;
      padding-bottom: 4mm;
      border-bottom: 1px solid ${GREEN}40;
    }
    .customer-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6mm;
    }
    .customer-name {
      font-size: 22px;
      font-weight: 700;
    }
    .customer-phone {
      font-size: 16px;
      font-weight: 500;
    }
    .customer-address {
      font-size: 16px;
      line-height: 2;
      white-space: pre-wrap;
    }
    .footer {
      background: ${GREEN};
      color: white;
      padding: 5mm 12mm;
      border-radius: 6px;
      margin: 6mm 4mm 0;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .footer-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 3mm;
    }
    .footer-contacts {
      font-size: 12px;
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    @media print {
      body { background: #fff; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="frame"></div>

    <div class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="${GREEN}">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
        <div>
          <div class="logo-text">GOOD CHOICE</div>
          <div class="logo-sub">กู๊ดช้อยส์</div>
        </div>
      </div>
      <div class="shop-info">
        <div class="shop-name">${SHOP_INFO.name}</div>
        <div>${SHOP_INFO.address1}</div>
        <div>${SHOP_INFO.address2}</div>
        <div>${SHOP_INFO.address3}</div>
        <div class="shop-phone">Tel: ${SHOP_INFO.phone}</div>
      </div>
    </div>

    <div class="customer-box">
      <div class="deliver-label">กรุณาส่ง</div>
      <div class="customer-header">
        <div class="customer-name">คุณ ${escape(customer.customerName)}</div>
        ${customer.phone ? `<div class="customer-phone">Tel: ${escape(customer.phone)}</div>` : ""}
      </div>
      ${customer.address ? `<div class="customer-address">${escape(customer.address)}</div>` : ""}
    </div>

    <div class="footer">
      <div class="footer-title">CONTACT US</div>
      <div class="footer-contacts">
        <span>${SHOP_INFO.phone}</span>
        <span>|</span>
        <span>${SHOP_INFO.line}</span>
        <span>|</span>
        <span>${SHOP_INFO.website}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function PrintOrderDialog({
  customer,
  open,
  onOpenChange,
}: PrintOrderDialogProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    const printContent = generatePrintHTML(customer);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต popup");
      return;
    }
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  const handleExportPdf = async () => {
    const el = previewRef.current;
    if (!el) return;

    setIsExporting(true);
    try {
      const origWidth = el.style.width;
      const origMaxWidth = el.style.maxWidth;
      const origTransform = el.style.transform;
      el.style.width = "210mm";
      el.style.maxWidth = "none";
      el.style.transform = "none";
      await new Promise((r) => setTimeout(r, 100));

      await exportToPdf(el, `ใบสั่งของ-${customer.customerName}`);
      toast.success("สร้างไฟล์ PDF สำเร็จ");

      el.style.width = origWidth;
      el.style.maxWidth = origMaxWidth;
      el.style.transform = origTransform;
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("ไม่สามารถสร้างไฟล์ PDF ได้");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ใบสั่งของ - {customer.customerName}</DialogTitle>
        </DialogHeader>

        {/* A4 Preview (scaled to fit) */}
        <div className="flex justify-center bg-gray-100 rounded-lg p-2 sm:p-4 overflow-auto">
          <div
            ref={previewRef}
            className="bg-white shadow-lg origin-top shrink-0"
            style={{ transform: "scale(var(--preview-scale, 0.5))" }}
          >
            <OrderSlipContent customer={customer} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="size-4" />
            พิมพ์
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
