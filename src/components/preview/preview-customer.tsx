"use client";

import { formatThaiDate } from "@/lib/thai-date";
import { Phone, Mail, User, Building2, MapPin } from "lucide-react";

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

interface PreviewCustomerProps {
  customer: CustomerSnapshot;
  documentDate: Date;
  documentNumber: string;
}

export function PreviewCustomer({
  customer,
  documentDate,
  documentNumber,
}: PreviewCustomerProps) {
  const isCompany = customer.type === "COMPANY";
  const displayName = isCompany
    ? customer.companyName || customer.customerName
    : customer.customerName;

  return (
    <div className="mb-6 flex items-start gap-4">
      {/* Left: Customer Info */}
      <div className="flex-1 min-w-0 rounded border border-gray-200 p-3 sm:p-4">
        <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">
          เรียน
        </h3>

        <div className="space-y-1.5">
          {/* Customer/Company Name */}
          <div className="flex items-start gap-2">
            {isCompany ? (
              <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
            ) : (
              <User className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
            )}
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                {displayName}
              </span>
              {customer.code && (
                <span className="text-xs text-gray-500 font-mono">
                  ({customer.code})
                </span>
              )}
            </div>
          </div>

          {/* Tax ID */}
          {customer.taxId && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
              <span>เลขประจำตัวผู้เสียภาษี: {customer.taxId}</span>
            </div>
          )}

          {/* Contact Person (for company type) */}
          {isCompany && customer.contactPerson && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
              <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>ผู้ติดต่อ: {customer.contactPerson}</span>
            </div>
          )}

          {/* Address */}
          {customer.address && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
              <span>{customer.address}</span>
            </div>
          )}

          {/* Phone & Email row */}
          <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1">
            {customer.phone && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700">
                <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-gray-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 min-w-0">
                <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-gray-400" />
                <span className="break-all">{customer.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Document Date & Number */}
      <div className="shrink-0 rounded border border-gray-200 p-3 sm:p-4 text-right">
        <div className="space-y-1 text-xs sm:text-sm text-gray-700">
          <div>
            <span className="font-semibold">วันที่:</span>{" "}
            {formatThaiDate(new Date(documentDate))}
          </div>
          <div>
            <span className="font-semibold">เลขที่:</span>{" "}
            {documentNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
