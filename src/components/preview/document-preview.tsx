"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatThaiDate } from "@/lib/thai-date";
import { PreviewHeader } from "./preview-header";
import { PreviewCustomer } from "./preview-customer";
import { PreviewLineItems } from "./preview-line-items";
import { PreviewSummary } from "./preview-summary";
import { PreviewPayment } from "./preview-payment";
import { PreviewFooter } from "./preview-footer";

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
  showImage: boolean;
  details?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PaymentTerm {
  sequence: number;
  name: string;
  type: "PERCENTAGE" | "AMOUNT";
  value: number;
  calculatedAmount: number;
  note?: string;
}

export interface DocumentData {
  id: string;
  type: "QUOTATION" | "INVOICE" | "RECEIPT";
  documentNumber: string;
  customInvoiceNumber?: string | null;
  status: "DRAFT" | "QUOTED" | "CONFIRMED" | "SAMPLE" | "BILLED" | "PAID" | "CANCELLED";
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
  freeShipping?: boolean;
  freeShippingLocation?: string | null;
  grandTotal: number;
  footerNotes?: string;
  productionDays?: string;
  deliveryDateStart?: Date;
  deliveryDateEnd?: Date;
  deliveryCompletedDate?: Date;
  paymentDate?: Date;
  lineItems: LineItem[];
  paymentTerms: PaymentTerm[];
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

function documentTypeLabel(documentType: string, vatEnabled?: boolean): string {
  if (documentType === "RECEIPT") {
    return vatEnabled ? "ใบเสร็จรับเงิน/ใบกำกับภาษี" : "ใบเสร็จรับเงิน";
  }
  return DOCUMENT_TYPE_LABELS[documentType] || documentType;
}

// Compact running header shown on continuation pages (page 2+).
function ContinuationHeader({
  company,
  documentType,
  vatEnabled,
  documentNumber,
  documentDate,
}: {
  company: CompanySnapshot;
  documentType: string;
  vatEnabled?: boolean;
  documentNumber: string;
  documentDate: Date;
}) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-gray-300 pb-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {company.logoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={company.logoUrl}
            alt={company.name}
            className="h-8 w-8 shrink-0 object-contain"
          />
        )}
        <span className="truncate text-sm font-bold text-gray-900">
          {company.name}
        </span>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs font-bold text-primary">
          {documentTypeLabel(documentType, vatEnabled)} (ต่อ)
        </div>
        <div className="text-[9px] text-gray-500">
          เลขที่ {documentNumber} · {formatThaiDate(new Date(documentDate))}
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

    const summaryBlock = (
      <>
        <PreviewSummary
          subtotal={doc.subtotal}
          discountType={doc.discountType}
          discountValue={doc.discountValue}
          discountAmount={doc.discountAmount}
          vatEnabled={doc.vatEnabled}
          vatRate={doc.vatRate}
          vatAmount={doc.vatAmount}
          shippingCost={doc.shippingCost}
          freeShipping={doc.freeShipping}
          freeShippingLocation={doc.freeShippingLocation}
          grandTotal={doc.grandTotal}
        />
        <PreviewPayment
          paymentTerms={doc.paymentTerms}
          company={{
            bankName: doc.companySnapshot.bankName,
            accountName: doc.companySnapshot.accountName,
            accountNumber: doc.companySnapshot.accountNumber,
            bankLogoUrl: doc.companySnapshot.bankLogoUrl,
            promptpayQrUrl: doc.companySnapshot.promptpayQrUrl,
          }}
          documentType={doc.type}
          paymentDate={doc.paymentDate}
          productionDays={doc.productionDays}
          deliveryDateStart={doc.deliveryDateStart}
          deliveryDateEnd={doc.deliveryDateEnd}
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
                  documentNumber={doc.documentNumber}
                  documentDate={doc.documentDate}
                />
              )}

              <PreviewLineItems items={items} />

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
              documentNumber={doc.documentNumber}
              documentDate={doc.documentDate}
            />
          </div>
          <div data-m="items">
            <PreviewLineItems items={doc.lineItems} />
          </div>
          <div data-m="summary" className="flex flex-col">
            {summaryBlock}
          </div>
        </div>
      </div>
    );
  }
);
