"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatThaiDate } from "@/lib/thai-date";
import { PreviewHeader } from "./preview-header";
import { PreviewCustomer } from "./preview-customer";
import { PreviewLineItems } from "./preview-line-items";
import { PreviewSummary } from "./preview-summary";
import { PreviewProductImages, type PreviewProductImageItem } from "./preview-product-images";
import { BankInfoBox, PreviewPayment } from "./preview-payment";
import { PreviewFooter } from "./preview-footer";

import { type ReceiptPaymentKind, type ReceiptPaymentSummary, RECEIPT_PAYMENT_LABELS } from "@/lib/receipt-payment";
import { type InvoiceBillingKind, type InvoiceBillingSummary, INVOICE_BILLING_LABELS, invoiceBillingTitle } from "@/lib/invoice-billing";
import { formatBaht } from "@/lib/thai-currency";

interface CompanySnapshot {
  name: string;
  address: string;
  taxId?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  lineOa?: string;
  tiktok?: string;
  logoUrl?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bankLogoUrl?: string;
  promptpayQrUrl?: string;
}

interface CustomerSnapshot {
  type: "COMPANY" | "INDIVIDUAL";
  code?: string;
  companyName?: string;
  customerName: string;
  contactPerson?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface LineItem {
  sequence: number;
  productSku?: string;
  productName: string;
  productImage?: string;
  colorVariantName?: string;
  colorVariantSku?: string;
  showImage: boolean;
  details?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sqmPerUnit?: string | null;
  unitLabel?: string | null;
}

interface PaymentTerm {
  sequence: number;
  name: string;
  type: "PERCENTAGE" | "AMOUNT";
  value: number;
  calculatedAmount: number;
  note?: string;
}

interface DepositDeduction {
  sequence: number;
  label: string;
  taxInvoiceNumber?: string | null;
  amount: number;
}

export interface DocumentData {
  id: string;
  type: "QUOTATION" | "INVOICE" | "RECEIPT";
  documentNumber: string | null;
  customInvoiceNumber?: string | null;
  status: "DRAFT" | "QUOTED" | "CONFIRMED" | "SAMPLE" | "SHIPPED" | "BILLED" | "DEPOSITED" | "PAID" | "CANCELLED";
  documentDate: Date;
  companySnapshot: CompanySnapshot;
  customerSnapshot: CustomerSnapshot;
  subtotal: number;
  discountType?: "PERCENTAGE" | "AMOUNT";
  discountValue?: number;
  discountAmount: number;
  vatEnabled: boolean;
  vatRate: number;
  vatAmount: number;
  shippingCost?: number;
  shippingLocation?: string | null;
  freeShipping?: boolean;
  freeShippingLocation?: string | null;
  pickupAtShowroom?: boolean;
  grandTotal: number;
  isDepositInvoice?: boolean;
  receiptPaymentType?: ReceiptPaymentKind | null;
  receiptPaymentSummary?: ReceiptPaymentSummary | null;
  invoiceBillingType?: InvoiceBillingKind | null;
  invoiceBillingSummary?: InvoiceBillingSummary | null;
  /** How the customer actually paid (receipts; invoices once marked paid). */
  paymentMethod?: "CASH" | "TRANSFER" | "CREDIT_CARD" | "PROMPTPAY" | "OTHER" | null;
  paymentReference?: string | null;
  depositDeduction?: number;
  netPayable?: number;
  depositDeductions?: DepositDeduction[];
  footerNotes?: string;
  productionDays?: string;
  deliveryDateStart?: Date;
  deliveryDateEnd?: Date;
  deliveryCompletedDate?: Date;
  paymentDate?: Date;
  lineItems: LineItem[];
  paymentTerms: PaymentTerm[];
  /** Receipts: the invoice they pay, for the "รูปสินค้า" box. */
  sourceInvoice?: { lineItems: PreviewProductImageItem[] } | null;
  /** Deposit invoices: the quotation they bill, for the "รูปสินค้า" box. */
  sourceQuotation?: { lineItems: PreviewProductImageItem[] } | null;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    signatureUrl?: string | null;
  };
}

interface DocumentPreviewProps {
  document: DocumentData;
  copyLabel?: string;
}

// ── A4 pagination metrics (CSS px) ──────────────────────────────────────────
// 1mm = 96/25.4 px in CSS. Exports force each page to 210mm × 297mm with 2rem
// (32px) padding, so we measure against those exact dimensions.
const PX_PER_MM = 96 / 25.4;
const A4_HEIGHT_PX = 297 * PX_PER_MM;
const PAGE_PADDING_PX = 32; // matches export padding (2rem)
const PAGE_NUMBER_RESERVE_PX = 28; // page-number band + safety margin
const CONTENT_HEIGHT_PX =
  A4_HEIGHT_PX - PAGE_PADDING_PX * 2 - PAGE_NUMBER_RESERVE_PX;

// Avoid React's useLayoutEffect SSR warning while still measuring before paint.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function documentTypeLabel(documentType: string, vatEnabled?: boolean, isDepositInvoice?: boolean, invoiceBillingType?: InvoiceBillingKind | null): string {
  if (documentType === "RECEIPT") {
    return vatEnabled ? "ใบเสร็จรับเงิน/ใบกำกับภาษี" : "ใบเสร็จรับเงิน";
  }
  if (documentType === "INVOICE" && isDepositInvoice) {
    return vatEnabled ? "ใบแจ้งหนี้มัดจำ/ใบกำกับภาษี" : "ใบแจ้งหนี้มัดจำ";
  }
  if (documentType === "INVOICE" && (invoiceBillingType === "DEPOSIT" || invoiceBillingType === "BALANCE")) {
    return invoiceBillingTitle(invoiceBillingType);
  }
  return DOCUMENT_TYPE_LABELS[documentType] || documentType;
}

// Compact running header shown on continuation pages (page 2+).
function ContinuationHeader({
  company,
  documentType,
  vatEnabled,
  isDepositInvoice,
  invoiceBillingType,
  documentNumber,
  documentDate,
}: {
  company: CompanySnapshot;
  documentType: string;
  vatEnabled?: boolean;
  isDepositInvoice?: boolean;
  invoiceBillingType?: InvoiceBillingKind | null;
  documentNumber: string | null;
  documentDate: Date;
}) {
  const isLongName = company.name.length > 25;

  return (
    <div className="mb-3 flex items-center justify-between border-b border-gray-300 pb-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {company.logoUrl && (
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-full w-full object-contain"
            />
          </div>
        )}
        <h1
          className={`font-bold text-gray-900 break-words ${
            isLongName ? "text-xs sm:text-base" : "text-lg sm:text-2xl"
          }`}
        >
          {company.name}
        </h1>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs font-bold text-primary">
          {documentTypeLabel(documentType, vatEnabled, isDepositInvoice, invoiceBillingType)} (ต่อ)
        </div>
        <div className="text-[9px] text-gray-500">
          เลขที่ {documentNumber ?? "ร่าง"} · {formatThaiDate(new Date(documentDate))}
        </div>
      </div>
    </div>
  );
}

function PageNumber({ index, total }: { index: number; total: number }) {
  return (
    <div className="mt-2 border-t border-gray-200 pt-1 text-center text-[9px] text-gray-400">
      หน้า {index} / {total}
    </div>
  );
}

// Distribute line-item rows across A4 pages given measured heights. The first
// page carries the full header, continuation pages a compact header, and the
// summary block always lands at the bottom of the final page.
function paginateRows(
  rowHeights: number[],
  fullHeaderH: number,
  compactHeaderH: number,
  tableHeaderH: number,
  summaryH: number
): number[][] {
  const n = rowHeights.length;
  const pages: number[][] = [];
  let i = 0;

  while (i < n) {
    const isFirst = pages.length === 0;
    const headerH = isFirst ? fullHeaderH : compactHeaderH;
    const available = CONTENT_HEIGHT_PX - headerH - tableHeaderH;
    const page: number[] = [];
    let used = 0;
    while (i < n) {
      const h = rowHeights[i];
      // Always keep at least one row per page so an oversized row can't loop.
      if (page.length > 0 && used + h > available) break;
      page.push(i);
      used += h;
      i += 1;
    }
    pages.push(page);
  }

  if (pages.length === 0) pages.push([]);

  // Ensure the summary block fits on the final page; otherwise push it down.
  const sumRows = (arr: number[]) =>
    arr.reduce((sum, r) => sum + rowHeights[r], 0);
  const last = pages[pages.length - 1];
  const lastHeaderH = pages.length === 1 ? fullHeaderH : compactHeaderH;
  const lastUsed = lastHeaderH + tableHeaderH + sumRows(last);

  if (lastUsed + summaryH > CONTENT_HEIGHT_PX && last.length > 0) {
    const moved = last.pop()!;
    const movedPageH = compactHeaderH + tableHeaderH + rowHeights[moved];
    if (movedPageH + summaryH <= CONTENT_HEIGHT_PX) {
      pages.push([moved]);
    } else {
      // Even one row + summary overflows: give the summary its own page.
      last.push(moved);
      pages.push([]);
    }
  }

  return pages;
}

export const DocumentPreview = forwardRef<HTMLDivElement, DocumentPreviewProps>(
  function DocumentPreview({ document: doc, copyLabel }, ref) {
    const measureRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<number[][] | null>(null);

    useIsomorphicLayoutEffect(() => {
      const root = measureRef.current;
      if (!root) return;

      const measure = () => {
        const fullHeader = root.querySelector<HTMLElement>('[data-m="fullHeader"]');
        const compactHeader = root.querySelector<HTMLElement>('[data-m="compactHeader"]');
        const summary = root.querySelector<HTMLElement>('[data-m="summary"]');
        const table = root.querySelector<HTMLElement>('[data-m="items"] table');
        const thead = table?.querySelector<HTMLElement>("thead");
        if (!fullHeader || !compactHeader || !summary || !table || !thead) return;

        const rowHeights = Array.from(
          table.querySelectorAll<HTMLElement>("tbody tr")
        ).map((tr) => tr.offsetHeight);

        setPages(
          paginateRows(
            rowHeights,
            fullHeader.offsetHeight,
            compactHeader.offsetHeight,
            thead.offsetHeight,
            summary.offsetHeight
          )
        );
      };

      measure();

      // Thai webfont (Sarabun) changes row heights once loaded — re-measure.
      let cancelled = false;
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
      if (fonts?.ready) {
        fonts.ready.then(() => {
          if (!cancelled) measure();
        });
      }
      return () => {
        cancelled = true;
      };
    }, [doc, copyLabel]);

    // Until measured, render every item on a single page (corrected before paint
    // by the layout effect above, so this fallback is never shown to the user).
    const resolvedPages =
      pages ?? [doc.lineItems.map((_, index) => index)];
    const total = resolvedPages.length;

    // Deposit / balance receipts carry no product lines of their own, so show
    // the invoice's product images in a box of their own above the summary.
    // Deposit / balance invoices are the same shape, with the quotation's product images.
    const billedPart = doc.type === "INVOICE" && (doc.invoiceBillingType === "DEPOSIT" || doc.invoiceBillingType === "BALANCE");
    const showProductImages =
      (doc.type === "RECEIPT" || billedPart) && !doc.lineItems.some((item) => item.productImage);
    const productImageItems = doc.type === "RECEIPT" ? doc.sourceInvoice?.lineItems : doc.sourceQuotation?.lineItems;
    // A deposit / balance receipt has one "รับชำระ..." line and no products,
    // so its price column must not read "ราคา/กล่อง".
    const paymentLines =
      ((doc.type === "RECEIPT" && !!doc.receiptPaymentType) || billedPart) &&
      !doc.lineItems.some((item) => item.productSku);
    const billing = billedPart && doc.invoiceBillingType ? doc.invoiceBillingSummary : null;
    const bankInfo = doc.companySnapshot.bankName || doc.companySnapshot.accountName || doc.companySnapshot.accountNumber
      ? {
          bankName: doc.companySnapshot.bankName, accountName: doc.companySnapshot.accountName,
          accountNumber: doc.companySnapshot.accountNumber, bankLogoUrl: doc.companySnapshot.bankLogoUrl,
          promptpayQrUrl: doc.companySnapshot.promptpayQrUrl,
        }
      : null;

    const summaryBlock = (
      <>
        {showProductImages && <PreviewProductImages items={productImageItems} />}
        {billing && doc.invoiceBillingType && (
          <div className="mb-3 flex items-stretch gap-3">
            {/* Same two columns as the รวมทั้งสิ้น row below: bank box left, billing box right */}
            <div className="flex-1 min-w-0">
              {bankInfo && <BankInfoBox company={bankInfo} compact />}
            </div>
            <div className={`w-full max-w-sm shrink-0 rounded border p-2 text-[11px] ${doc.invoiceBillingType === "DEPOSIT" ? "border-amber-200 bg-amber-50/40" : "border-blue-200 bg-blue-50/40"}`}>
              <div className="mb-1 font-semibold">{INVOICE_BILLING_LABELS[doc.invoiceBillingType]} ตามใบเสนอราคา {billing.quotationNumber}</div>
              <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
                <span>ยอดใบเสนอราคา</span><span className="text-right">{formatBaht(billing.quotationTotal)}</span>
                <span>มัดจำแล้ว</span><span className="text-right">{formatBaht(billing.previousDeposits)}</span>
                <strong>เรียกเก็บครั้งนี้</strong><strong className="text-right">{formatBaht(billing.billedAmount)}</strong>
                <span>คงเหลือ</span><span className="text-right">{formatBaht(billing.remainingBalance)}</span>
              </div>
            </div>
          </div>
        )}
        {doc.receiptPaymentType && doc.receiptPaymentSummary && (
          <div className="mb-3 rounded border border-blue-200 p-2 text-[11px]">
            <div className="mb-1 font-semibold">รับชำระ{RECEIPT_PAYMENT_LABELS[doc.receiptPaymentType]} ตามใบแจ้งหนี้เลขที่ {doc.receiptPaymentSummary.invoiceNumber}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>ยอดใบแจ้งหนี้</span><span className="text-right">{formatBaht(doc.receiptPaymentSummary.invoiceTotal)}</span>
              <span>รับชำระก่อนหน้านี้</span><span className="text-right">{formatBaht(doc.receiptPaymentSummary.previousPayments)}</span>
              <strong>รับชำระครั้งนี้</strong><strong className="text-right">{formatBaht(doc.receiptPaymentSummary.paymentAmount)}</strong>
              <span>ยอดคงเหลือหลังรับชำระ</span><span className="text-right">{formatBaht(doc.receiptPaymentSummary.remainingBalance)}</span>
            </div>
          </div>
        )}
        <PreviewSummary
          subtotal={doc.subtotal}
          discountType={doc.discountType}
          discountValue={doc.discountValue}
          discountAmount={doc.discountAmount}
          vatEnabled={doc.vatEnabled}
          vatRate={doc.vatRate}
          vatAmount={doc.vatAmount}
          shippingCost={doc.shippingCost}
          shippingLocation={doc.shippingLocation}
          freeShipping={doc.freeShipping}
          freeShippingLocation={doc.freeShippingLocation}
          pickupAtShowroom={doc.pickupAtShowroom}
          grandTotal={doc.grandTotal}
          depositDeductions={doc.depositDeductions}
          netPayable={doc.netPayable}
        />
        <PreviewPayment
          paymentTerms={billedPart ? [] : doc.paymentTerms}
          company={billedPart ? {} : {
            bankName: doc.companySnapshot.bankName,
            accountName: doc.companySnapshot.accountName,
            accountNumber: doc.companySnapshot.accountNumber,
            bankLogoUrl: doc.companySnapshot.bankLogoUrl,
            promptpayQrUrl: doc.companySnapshot.promptpayQrUrl,
          }}
          documentType={doc.type}
          paymentDate={doc.paymentDate}
          paymentMethod={billedPart ? undefined : doc.paymentMethod}
          paymentReference={billedPart ? undefined : doc.paymentReference}
          productionDays={billedPart ? undefined : doc.productionDays}
          deliveryDateStart={billedPart ? undefined : doc.deliveryDateStart}
          deliveryDateEnd={billedPart ? undefined : doc.deliveryDateEnd}
          deliveryCompletedDate={doc.deliveryCompletedDate}
        />
        <PreviewFooter
          footerNotes={doc.footerNotes}
          documentDate={doc.documentDate}
          createdBy={doc.createdBy}
        />
      </>
    );

    return (
      <div
        ref={ref}
        className="relative flex w-full flex-col items-center gap-6 print:gap-0"
      >
        {resolvedPages.map((indices, pageIndex) => {
          const isFirst = pageIndex === 0;
          const isLast = pageIndex === total - 1;
          const items = indices.map((index) => doc.lineItems[index]);

          return (
            <div
              key={pageIndex}
              id="document-preview"
              className="flex w-full max-w-[210mm] min-h-[297mm] flex-col bg-white p-4 shadow-lg sm:p-6 print:w-[210mm] print:min-h-[297mm] print:max-w-none print:p-0 print:shadow-none"
              style={!isLast ? { breakAfter: "page" } : undefined}
            >
              {isFirst ? (
                <>
                  <PreviewHeader
                    company={doc.companySnapshot}
                    documentType={doc.type}
                    vatEnabled={doc.vatEnabled}
                    isDepositInvoice={doc.isDepositInvoice}
                    invoiceBillingType={doc.invoiceBillingType}
                    copyLabel={copyLabel}
                  />
                  <PreviewCustomer
                    customer={doc.customerSnapshot}
                    documentDate={doc.documentDate}
                    documentNumber={doc.documentNumber}
                    customInvoiceNumber={doc.customInvoiceNumber}
                    documentType={doc.type}
                  />
                </>
              ) : (
                <ContinuationHeader
                  company={doc.companySnapshot}
                  documentType={doc.type}
                  vatEnabled={doc.vatEnabled}
                  isDepositInvoice={doc.isDepositInvoice}
                  invoiceBillingType={doc.invoiceBillingType}
                  documentNumber={doc.documentNumber}
                  documentDate={doc.documentDate}
                />
              )}

              <PreviewLineItems items={items} paymentLines={paymentLines} />

              {/* Spacer: pushes summary (last page) and page number to the bottom */}
              <div className="flex-grow" />

              {isLast && summaryBlock}

              {total > 1 && <PageNumber index={pageIndex + 1} total={total} />}
            </div>
          );
        })}

        {/* Off-screen measuring layer — excluded from html2canvas exports and
            print, kept out of layout flow so it never affects the visible page. */}
        <div
          ref={measureRef}
          data-html2canvas-ignore="true"
          aria-hidden
          className="invisible pointer-events-none absolute left-0 top-0 h-0 w-[210mm] overflow-hidden px-8 print:hidden"
        >
          <div data-m="fullHeader" className="flex flex-col">
            <PreviewHeader
              company={doc.companySnapshot}
              documentType={doc.type}
              vatEnabled={doc.vatEnabled}
              isDepositInvoice={doc.isDepositInvoice}
              invoiceBillingType={doc.invoiceBillingType}
              copyLabel={copyLabel}
            />
            <PreviewCustomer
              customer={doc.customerSnapshot}
              documentDate={doc.documentDate}
              documentNumber={doc.documentNumber}
              customInvoiceNumber={doc.customInvoiceNumber}
              documentType={doc.type}
            />
          </div>
          <div data-m="compactHeader" className="flex flex-col">
            <ContinuationHeader
              company={doc.companySnapshot}
              documentType={doc.type}
              vatEnabled={doc.vatEnabled}
              isDepositInvoice={doc.isDepositInvoice}
              invoiceBillingType={doc.invoiceBillingType}
              documentNumber={doc.documentNumber}
              documentDate={doc.documentDate}
            />
          </div>
          <div data-m="items">
            <PreviewLineItems items={doc.lineItems} paymentLines={paymentLines} />
          </div>
          <div data-m="summary" className="flex flex-col">
            {summaryBlock}
          </div>
        </div>
      </div>
    );
  }
);
