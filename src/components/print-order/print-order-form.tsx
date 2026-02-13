"use client";

import { useRef, useState } from "react";
import { Printer, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CompanySelect } from "@/components/companies/company-select";
import { CustomerSelect } from "@/components/customers/customer-select";

interface PrintOrderFormProps {
  companies: any[];
  customers: any[];
}

interface ShopInfo {
  name: string;
  address: string;
  logoUrl: string;
  phone: string;
  lineOa: string;
}

interface CustomerInfo {
  customerName: string;
  phone: string;
  address: string;
}

const GREEN = "#2d5a27";

function OrderSlipContent({
  shop,
  customer,
}: {
  shop: ShopInfo;
  customer: CustomerInfo | null;
}) {
  return (
    <div
      style={{
        width: "297mm",
        height: "210mm",
        padding: "10mm 12mm",
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
          inset: "5mm",
          border: `2px solid ${GREEN}`,
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      />

      {/* Header: Logo + Shop Info (top-left) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "8mm",
          padding: "0 4mm",
        }}
      >
        {/* Logo */}
        {shop.logoUrl ? (
          <div
            style={{
              width: "60px",
              height: "60px",
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: "6px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shop.logoUrl}
              alt={shop.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <div
            style={{
              width: "60px",
              height: "60px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${GREEN}15`,
              borderRadius: "6px",
            }}
          >
            <svg viewBox="0 0 24 24" width="36" height="36" fill={GREEN}>
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
            </svg>
          </div>
        )}

        {/* Shop Name + Address */}
        <div style={{ lineHeight: 1.6 }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: GREEN,
              lineHeight: 1.2,
            }}
          >
            {shop.name || "ชื่อร้าน"}
          </div>
          {shop.address && (
            <div
              style={{
                fontSize: "13px",
                whiteSpace: "pre-wrap",
                marginTop: "2mm",
                lineHeight: 1.7,
              }}
            >
              {shop.address}
            </div>
          )}
          {shop.phone && (
            <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "1mm" }}>
              Tel: {shop.phone}
            </div>
          )}
        </div>
      </div>

      {/* Customer Info Box (middle-left) */}
      <div
        style={{
          border: `2px solid ${GREEN}`,
          borderRadius: "8px",
          padding: "8mm 10mm",
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
            marginBottom: "6mm",
            paddingBottom: "3mm",
            borderBottom: `1px solid ${GREEN}40`,
          }}
        >
          กรุณาส่ง
        </div>

        {customer ? (
          <>
            {/* Customer Name + Phone */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "4mm",
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
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              fontSize: "16px",
            }}
          >
            กรุณาเลือกลูกค้า
          </div>
        )}
      </div>

      {/* Footer */}
      {(shop.phone || shop.lineOa) && (
        <div
          style={{
            background: GREEN,
            color: "white",
            padding: "4mm 10mm",
            borderRadius: "6px",
            marginTop: "5mm",
            textAlign: "center",
            margin: "5mm 4mm 0",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2px",
              marginBottom: "2mm",
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
            {shop.phone && <span>{shop.phone}</span>}
            {shop.phone && shop.lineOa && <span>|</span>}
            {shop.lineOa && <span>{shop.lineOa}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function generatePrintHTML(shop: ShopInfo, customer: CustomerInfo): string {
  const escape = (str: string | null | undefined) =>
    (str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const logoHtml = shop.logoUrl
    ? `<img src="${escape(shop.logoUrl)}" alt="${escape(shop.name)}" style="width:60px;height:60px;object-fit:contain;border-radius:6px;" crossorigin="anonymous" />`
    : `<svg viewBox="0 0 24 24" width="36" height="36" fill="${GREEN}"><path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/></svg>`;

  const footerHtml =
    shop.phone || shop.lineOa
      ? `<div class="footer">
      <div class="footer-title">CONTACT US</div>
      <div class="footer-contacts">
        ${shop.phone ? `<span>${escape(shop.phone)}</span>` : ""}
        ${shop.phone && shop.lineOa ? `<span>|</span>` : ""}
        ${shop.lineOa ? `<span>${escape(shop.lineOa)}</span>` : ""}
      </div>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>ใบสั่งของ - ${escape(customer.customerName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 0; }
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
      width: 297mm;
      height: 210mm;
      padding: 10mm 12mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      position: relative;
      color: #1a1a1a;
    }
    .frame {
      position: absolute;
      inset: 5mm;
      border: 2px solid ${GREEN};
      border-radius: 4px;
      pointer-events: none;
    }
    .header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8mm;
      padding: 0 4mm;
    }
    .logo-img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .logo-placeholder {
      width: 60px;
      height: 60px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${GREEN}15;
      border-radius: 6px;
    }
    .shop-info { line-height: 1.6; }
    .shop-name {
      font-size: 22px;
      font-weight: 700;
      color: ${GREEN};
      line-height: 1.2;
    }
    .shop-address {
      font-size: 13px;
      white-space: pre-wrap;
      margin-top: 2mm;
      line-height: 1.7;
    }
    .shop-phone {
      font-size: 13px;
      font-weight: 600;
      margin-top: 1mm;
    }
    .customer-box {
      border: 2px solid ${GREEN};
      border-radius: 8px;
      padding: 8mm 10mm;
      flex: 1;
      display: flex;
      flex-direction: column;
      margin: 0 4mm;
    }
    .deliver-label {
      font-size: 20px;
      color: ${GREEN};
      font-weight: 600;
      margin-bottom: 6mm;
      padding-bottom: 3mm;
      border-bottom: 1px solid ${GREEN}40;
    }
    .customer-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4mm;
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
      padding: 4mm 10mm;
      border-radius: 6px;
      margin: 5mm 4mm 0;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .footer-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 2mm;
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
      ${shop.logoUrl ? `<img class="logo-img" src="${escape(shop.logoUrl)}" alt="${escape(shop.name)}" crossorigin="anonymous" />` : `<div class="logo-placeholder">${logoHtml}</div>`}
      <div class="shop-info">
        <div class="shop-name">${escape(shop.name)}</div>
        ${shop.address ? `<div class="shop-address">${escape(shop.address)}</div>` : ""}
        ${shop.phone ? `<div class="shop-phone">Tel: ${escape(shop.phone)}</div>` : ""}
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

    ${footerHtml}
  </div>
</body>
</html>`;
}

export function PrintOrderForm({ companies, customers }: PrintOrderFormProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    name: "",
    address: "",
    logoUrl: "",
    phone: "",
    lineOa: "",
  });

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const handleCompanySelect = (company: any) => {
    setSelectedCompanyId(company.id);
    setShopInfo({
      name: company.name ?? "",
      address: company.address ?? "",
      logoUrl: company.logoUrl ?? "",
      phone: company.phone ?? "",
      lineOa: company.lineOa ?? "",
    });
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setCustomerInfo({
      customerName: customer.customerName ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
    });
  };

  const handlePrint = () => {
    if (!customerInfo) {
      toast.error("กรุณาเลือกลูกค้าก่อนพิมพ์");
      return;
    }

    const printContent = generatePrintHTML(shopInfo, customerInfo);
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
    if (!customerInfo) {
      toast.error("กรุณาเลือกลูกค้าก่อนส่งออก PDF");
      return;
    }

    const el = previewRef.current;
    if (!el) return;

    setIsExporting(true);
    try {
      const origWidth = el.style.width;
      const origMaxWidth = el.style.maxWidth;
      const origTransform = el.style.transform;
      el.style.width = "297mm";
      el.style.maxWidth = "none";
      el.style.transform = "none";
      await new Promise((r) => setTimeout(r, 100));

      await exportToPdfLandscape(el, `ใบสั่งของ-${customerInfo.customerName}`);
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
    <div className="space-y-6">
      {/* Form controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>เลือกบริษัท (ข้อมูลร้าน)</Label>
          <CompanySelect
            value={selectedCompanyId}
            onSelect={handleCompanySelect}
            companies={companies}
          />
        </div>
        <div className="space-y-2">
          <Label>เลือกลูกค้า</Label>
          <CustomerSelect
            value={selectedCustomerId}
            onSelect={handleCustomerSelect}
            customers={customers}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleExportPdf}
          disabled={isExporting || !customerInfo}
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          PDF
        </Button>
        <Button onClick={handlePrint} disabled={!customerInfo}>
          <Printer className="size-4" />
          พิมพ์
        </Button>
      </div>

      {/* A4 Landscape Preview (scaled to fit) */}
      <div className="bg-gray-100 rounded-lg p-2 sm:p-4 overflow-auto">
        <div className="flex justify-center">
          <div
            ref={previewRef}
            className="bg-white shadow-lg origin-top shrink-0"
            style={{
              transform: "scale(var(--preview-scale, 0.38))",
              marginBottom: "calc((210mm * var(--preview-scale, 0.38)) - 210mm)",
            }}
          >
            <OrderSlipContent shop={shopInfo} customer={customerInfo} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Landscape PDF export helper
async function exportToPdfLandscape(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const { default: html2canvas } = await import("html2canvas-pro");
  const { default: jsPDF } = await import("jspdf");

  // Preload images
  const images = element.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      try {
        let response = await fetch(img.src, { mode: "cors" }).catch(() => null);
        if (!response || !response.ok) {
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(img.src)}`;
          response = await fetch(proxyUrl);
        }
        if (response && response.ok) {
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
        }
      } catch {
        // ignore
      }
    })
  );

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF("l", "mm", "a4"); // landscape
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = pdfWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  let position = 0;
  let heightLeft = scaledHeight;

  pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, scaledHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(`${filename}.pdf`);
}
