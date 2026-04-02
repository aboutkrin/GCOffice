"use client";

import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import {
  Phone,
  Mail,
  MessageCircle,
  Facebook,
  Instagram,
  MapPin,
} from "lucide-react";

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

interface PreviewHeaderProps {
  company: CompanySnapshot;
  documentType: string;
  vatEnabled?: boolean;
  copyLabel?: string;
}

export function PreviewHeader({
  company,
  documentType,
  vatEnabled,
  copyLabel,
}: PreviewHeaderProps) {
  let typeLabel: string;
  if (documentType === "RECEIPT") {
    typeLabel = vatEnabled
      ? "ใบเสร็จรับเงิน/ใบกำกับภาษี"
      : "ใบเสร็จรับเงิน";
  } else {
    typeLabel = DOCUMENT_TYPE_LABELS[documentType] || documentType;
  }

  const isLongName = company.name.length > 25;

  return (
    <div className="mb-3">
      {/* Top row: Logo + Company Name on left, Document Type on right */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
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
          <h1 className={`font-bold text-gray-900 break-words ${isLongName ? "text-xs sm:text-base" : "text-lg sm:text-2xl"}`}>
            {company.name}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <h2 className="text-lg sm:text-2xl font-bold text-primary">
            {typeLabel}
          </h2>
          {documentType === "RECEIPT" && copyLabel && (
            <p className="text-xs sm:text-sm text-primary/80">({copyLabel})</p>
          )}
        </div>
      </div>

      {/* Company address & contact info - below logo row */}
      <div className="grid grid-cols-1 gap-0.5 text-[8px] text-gray-600">
        {(company.address || company.taxId) && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              {company.address}
              {company.address && company.taxId && "  "}
              {company.taxId && `เลขประจำตัวผู้เสียภาษี: ${company.taxId}`}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {company.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0" />
              <span>{company.email}</span>
            </div>
          )}
          {company.lineOa && (
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3 shrink-0" />
              <span>LINE: {company.lineOa}</span>
            </div>
          )}
          {company.tiktok && (
            <div className="flex items-center gap-1.5">
              <svg
                className="h-3 w-3 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.06a8.16 8.16 0 0 0 3.85.92V6.69Z" />
              </svg>
              <span>{company.tiktok}</span>
            </div>
          )}
          {company.instagram && (
            <div className="flex items-center gap-1.5">
              <Instagram className="h-3 w-3 shrink-0" />
              <span>{company.instagram}</span>
            </div>
          )}
          {company.facebook && (
            <div className="flex items-center gap-1.5">
              <Facebook className="h-3 w-3 shrink-0" />
              <span>{company.facebook}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
