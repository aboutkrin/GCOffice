"use client";

import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import {
  Phone,
  Mail,
  MessageCircle,
  Facebook,
  MapPin,
} from "lucide-react";

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

interface PreviewHeaderProps {
  company: CompanySnapshot;
  documentType: string;
}

export function PreviewHeader({
  company,
  documentType,
}: PreviewHeaderProps) {
  const typeLabel =
    DOCUMENT_TYPE_LABELS[documentType] || documentType;

  return (
    <div className="mb-3">
      {/* Top Row: Logo + Company Name | Document Type */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {/* Left: Logo and Company Name */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {company.logoUrl && (
            <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
              {company.name}
            </h1>
            {company.taxId && (
              <p className="text-[10px] text-gray-500">
                เลขประจำตัวผู้เสียภาษี: {company.taxId}
              </p>
            )}
          </div>
        </div>

        {/* Right: Document Type */}
        <div className="text-right shrink-0">
          <h2 className="text-lg sm:text-2xl font-bold text-primary">
            {typeLabel}
          </h2>
        </div>
      </div>

      {/* Company Contact Info */}
      <div className="grid grid-cols-1 gap-0.5 text-[10px] text-gray-600">
        {company.address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{company.address}</span>
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
          {company.facebook && (
            <div className="flex items-center gap-1.5">
              <Facebook className="h-3 w-3 shrink-0" />
              <span>{company.facebook}</span>
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
        </div>
      </div>
    </div>
  );
}
