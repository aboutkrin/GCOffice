"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Printer, FileDown, ImageIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { CustomerSelect } from "@/components/customers/customer-select";

interface PrintOrderFormProps {
  customers: any[];
}

interface ShopInfo {
  address: string;
  logoUrl: string;
  phone: string;
  lineOa: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

interface CustomerInfo {
  customerName: string;
  phone: string;
  address: string;
}

const THEME_COLOR = "#5b9bd5";
const THEME_COLOR_LIGHT = "#d6e8f7";

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
      {/* Header: Logo + Shop Info (top-left) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8mm",
          padding: "0 4mm",
        }}
      >
        {/* Logo — sized to match address block height */}
        {shop.logoUrl && (
          <div
            style={{
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: "6px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shop.logoUrl}
              alt="โลโก้ร้าน"
              style={{
                height: "auto",
                maxHeight: "112px",
                width: "auto",
                maxWidth: "160px",
                objectFit: "contain",
              }}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* Divider */}
        {shop.logoUrl && (
          <div
            style={{
              width: "1px",
              alignSelf: "stretch",
              backgroundColor: "#d1d5db",
              flexShrink: 0,
            }}
          />
        )}

        {/* Address */}
        <div style={{ lineHeight: 1.6 }}>
          {shop.address && (
            <div
              style={{
                fontSize: "11px",
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
              }}
            >
              {shop.address}
            </div>
          )}
          {shop.phone && (
            <div style={{ fontSize: "11px", fontWeight: 600, marginTop: "1mm" }}>
              Tel: {shop.phone}
            </div>
          )}
        </div>
      </div>

      {/* Customer Info Box — half A4 width */}
      <div
        style={{
          border: `2px solid ${THEME_COLOR}`,
          borderRadius: "8px",
          padding: "8mm 10mm",
          width: "50%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          margin: "auto 4mm",
          background: THEME_COLOR_LIGHT,
        }}
      >
        {/* กรุณาส่ง label */}
        <div
          style={{
            fontSize: "20px",
            color: THEME_COLOR,
            fontWeight: 600,
            marginBottom: "6mm",
            paddingBottom: "3mm",
            borderBottom: `1px solid ${THEME_COLOR}40`,
          }}
        >
          กรุณาส่ง
        </div>

        {customer ? (
          <>
            {/* Customer Name */}
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                marginBottom: "4mm",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {customer.customerName}
            </div>

            {/* Customer Address */}
            {customer.address && (
              <div
                style={{
                  fontSize: "16px",
                  lineHeight: 2,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {customer.address}
              </div>
            )}

            {/* Customer Phone — below address */}
            {customer.phone && (
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  marginTop: "3mm",
                }}
              >
                Tel: {customer.phone}
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
      {(shop.phone || shop.lineOa || shop.instagram || shop.facebook || shop.tiktok) && (
        <div
          style={{
            background: THEME_COLOR,
            color: "white",
            padding: "4mm 10mm",
            borderRadius: "6px",
            marginTop: "auto",
            textAlign: "center",
            margin: "auto 4mm 0",
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
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {shop.phone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {shop.phone}
              </span>
            )}
            {shop.lineOa && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                {shop.lineOa}
              </span>
            )}
            {shop.instagram && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                {shop.instagram}
              </span>
            )}
            {shop.tiktok && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.06a8.16 8.16 0 0 0 3.85.92V6.69Z"/></svg>
                {shop.tiktok}
              </span>
            )}
            {shop.facebook && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                {shop.facebook}
              </span>
            )}
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
    ? `<img src="${escape(shop.logoUrl)}" alt="โลโก้ร้าน" style="height:auto;max-height:112px;width:auto;max-width:160px;object-fit:contain;border-radius:6px;" crossorigin="anonymous" />`
    : "";

  const contactItems: string[] = [];
  if (shop.phone) {
    contactItems.push(`<span class="contact-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escape(shop.phone)}</span>`);
  }
  if (shop.lineOa) {
    contactItems.push(`<span class="contact-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>${escape(shop.lineOa)}</span>`);
  }
  if (shop.instagram) {
    contactItems.push(`<span class="contact-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>${escape(shop.instagram)}</span>`);
  }
  if (shop.tiktok) {
    contactItems.push(`<span class="contact-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.06a8.16 8.16 0 0 0 3.85.92V6.69Z"/></svg>${escape(shop.tiktok)}</span>`);
  }
  if (shop.facebook) {
    contactItems.push(`<span class="contact-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>${escape(shop.facebook)}</span>`);
  }

  const footerHtml = contactItems.length > 0
    ? `<div class="footer">
      <div class="footer-title">CONTACT US</div>
      <div class="footer-contacts">
        ${contactItems.join("\n        ")}
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
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8mm;
      padding: 0 4mm;
    }
    .logo-img {
      height: auto;
      max-height: 112px;
      width: auto;
      max-width: 160px;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .header-divider {
      width: 1px;
      align-self: stretch;
      background-color: #d1d5db;
      flex-shrink: 0;
    }
    .shop-info { line-height: 1.6; }
    .shop-address {
      font-size: 11px;
      white-space: pre-wrap;
      margin-top: 2mm;
      line-height: 1.7;
    }
    .shop-phone {
      font-size: 11px;
      font-weight: 600;
      margin-top: 1mm;
    }
    .customer-box {
      border: 2px solid ${THEME_COLOR};
      border-radius: 8px;
      padding: 8mm 10mm;
      width: 50%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      margin: auto 4mm;
      background: ${THEME_COLOR_LIGHT};
    }
    .deliver-label {
      font-size: 20px;
      color: ${THEME_COLOR};
      font-weight: 600;
      margin-bottom: 6mm;
      padding-bottom: 3mm;
      border-bottom: 1px solid ${THEME_COLOR}40;
    }
    .customer-name {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4mm;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .customer-phone {
      font-size: 16px;
      font-weight: 500;
      margin-top: 3mm;
    }
    .customer-address {
      font-size: 16px;
      line-height: 2;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .footer {
      background: ${THEME_COLOR};
      color: white;
      padding: 4mm 10mm;
      border-radius: 6px;
      margin: auto 4mm 0;
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
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .contact-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .contact-item svg {
      flex-shrink: 0;
    }
    @media print {
      body { background: #fff; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${logoHtml ? `${logoHtml}<div class="header-divider"></div>` : ""}
      <div class="shop-info">
        ${shop.address ? `<div class="shop-address">${escape(shop.address)}</div>` : ""}
        ${shop.phone ? `<div class="shop-phone">Tel: ${escape(shop.phone)}</div>` : ""}
      </div>
    </div>

    <div class="customer-box">
      <div class="deliver-label">กรุณาส่ง</div>
      <div class="customer-name">${escape(customer.customerName)}</div>
      ${customer.address ? `<div class="customer-address">${escape(customer.address)}</div>` : ""}
      ${customer.phone ? `<div class="customer-phone">Tel: ${escape(customer.phone)}</div>` : ""}
    </div>

    ${footerHtml}
  </div>
</body>
</html>`;
}

const SHOP_INFO_STORAGE_KEY = "print-order-shop-info";

function loadShopInfo(): ShopInfo {
  if (typeof window === "undefined") {
    return { address: "", logoUrl: "", phone: "", lineOa: "", instagram: "", facebook: "", tiktok: "" };
  }
  try {
    const saved = localStorage.getItem(SHOP_INFO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        address: parsed.address ?? "",
        logoUrl: parsed.logoUrl ?? "",
        phone: parsed.phone ?? "",
        lineOa: parsed.lineOa ?? "",
        instagram: parsed.instagram ?? "",
        facebook: parsed.facebook ?? "",
        tiktok: parsed.tiktok ?? "",
      };
    }
  } catch {
    // ignore
  }
  return { address: "", logoUrl: "", phone: "", lineOa: "", instagram: "", facebook: "", tiktok: "" };
}

export function PrintOrderForm({ customers }: PrintOrderFormProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => loadShopInfo());

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Load saved shop info on mount
  useEffect(() => {
    setShopInfo(loadShopInfo());
  }, []);

  const handleShopFieldChange = useCallback(
    (field: keyof ShopInfo, value: string) => {
      setShopInfo((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSaveShopInfo = useCallback(() => {
    try {
      localStorage.setItem(SHOP_INFO_STORAGE_KEY, JSON.stringify(shopInfo));
      toast.success("บันทึกข้อมูลร้านสำเร็จ");
    } catch {
      toast.error("ไม่สามารถบันทึกข้อมูลร้านได้");
    }
  }, [shopInfo]);

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

  const handleExportJpg = async () => {
    if (!customerInfo) {
      toast.error("กรุณาเลือกลูกค้าก่อนส่งออกรูปภาพ");
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

      const { exportToJpg } = await import("@/lib/export-jpg");
      await exportToJpg(el, `ใบสั่งของ-${customerInfo.customerName}`);
      toast.success("สร้างรูปภาพสำเร็จ");

      el.style.width = origWidth;
      el.style.maxWidth = origMaxWidth;
      el.style.transform = origTransform;
    } catch (error) {
      console.error("JPG export failed:", error);
      toast.error("ไม่สามารถสร้างรูปภาพได้");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shop info — manual input */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">ข้อมูลร้าน</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveShopInfo}
          >
            <Save className="size-4" />
            บันทึกข้อมูลร้าน
          </Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>โลโก้ร้าน</Label>
            <ImageUpload
              value={shopInfo.logoUrl}
              onChange={(url) => handleShopFieldChange("logoUrl", url)}
              bucket="company-logos"
              folder="shop-logos"
            />
          </div>
          <div className="space-y-2">
            <Label>ที่อยู่ร้าน</Label>
            <Textarea
              placeholder="ที่อยู่ร้าน"
              value={shopInfo.address}
              onChange={(e) => handleShopFieldChange("address", e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>เบอร์โทรศัพท์</Label>
              <Input
                placeholder="0xx-xxx-xxxx"
                value={shopInfo.phone}
                onChange={(e) => handleShopFieldChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>LINE OA</Label>
              <Input
                placeholder="@line-oa"
                value={shopInfo.lineOa}
                onChange={(e) => handleShopFieldChange("lineOa", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                placeholder="@instagram"
                value={shopInfo.instagram}
                onChange={(e) => handleShopFieldChange("instagram", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                placeholder="Facebook page"
                value={shopInfo.facebook}
                onChange={(e) => handleShopFieldChange("facebook", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>TikTok</Label>
              <Input
                placeholder="@tiktok"
                value={shopInfo.tiktok}
                onChange={(e) => handleShopFieldChange("tiktok", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer selection */}
      <div className="space-y-2">
        <Label>เลือกลูกค้า</Label>
        <CustomerSelect
          value={selectedCustomerId}
          onSelect={handleCustomerSelect}
          customers={customers}
        />
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
        <Button
          variant="outline"
          onClick={handleExportJpg}
          disabled={isExporting || !customerInfo}
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImageIcon className="size-4" />
          )}
          JPG
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
