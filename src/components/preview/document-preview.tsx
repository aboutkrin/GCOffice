"use client";

import { forwardRef } from "react";
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
  type: "QUOTATION" | "INVOICE";
  documentNumber: string;
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
  grandTotal: number;
  footerNotes?: string;
  productionDays?: string;
  deliveryDateStart?: Date;
  deliveryDateEnd?: Date;
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
}

export const DocumentPreview = forwardRef<HTMLDivElement, DocumentPreviewProps>(
  function DocumentPreview({ document: doc }, ref) {
    return (
      <div
        id="document-preview"
        ref={ref}
        className="w-full max-w-[210mm] md:min-h-[297mm] mx-auto bg-white p-4 sm:p-8 shadow-lg print:shadow-none print:p-0 print:w-[210mm] print:max-w-none print:min-h-[297mm]"
      >
        {/* Header: Company + Document Type + Number + Date */}
        <PreviewHeader
          company={doc.companySnapshot}
          documentType={doc.type}
          documentNumber={doc.documentNumber}
          documentDate={doc.documentDate}
        />

        {/* Customer Info */}
        <PreviewCustomer customer={doc.customerSnapshot} />

        {/* Line Items Table */}
        <PreviewLineItems items={doc.lineItems} />

        {/* Summary: Subtotal, Discount, VAT, Grand Total */}
        <PreviewSummary
          subtotal={doc.subtotal}
          discountType={doc.discountType}
          discountValue={doc.discountValue}
          discountAmount={doc.discountAmount}
          vatEnabled={doc.vatEnabled}
          vatRate={doc.vatRate}
          vatAmount={doc.vatAmount}
          grandTotal={doc.grandTotal}
        />

        {/* Payment Terms + Bank Info */}
        <PreviewPayment
          paymentTerms={doc.paymentTerms}
          company={{
            bankName: doc.companySnapshot.bankName,
            accountName: doc.companySnapshot.accountName,
            accountNumber: doc.companySnapshot.accountNumber,
            bankLogoUrl: doc.companySnapshot.bankLogoUrl,
            promptpayQrUrl: doc.companySnapshot.promptpayQrUrl,
          }}
        />

        {/* Footer: Notes, Delivery, Signatures */}
        <PreviewFooter
          footerNotes={doc.footerNotes}
          productionDays={doc.productionDays}
          deliveryDateStart={doc.deliveryDateStart}
          deliveryDateEnd={doc.deliveryDateEnd}
          createdBy={doc.createdBy}
        />
      </div>
    );
  }
);
