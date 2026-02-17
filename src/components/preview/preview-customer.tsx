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
    <div className="mb-3 flex items-stretch gap-4">
      {/* Left: Customer Info */}
      <div className="flex-1 min-w-0 rounded border border-gray-200 p-2 sm:p-3">
        <h3 className="mb-1 sm:mb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
          เรียน
        </h3>

        <div className="space-y-0.5">
          {/* Customer/Company Name */}
          <div className="flex items-start gap-2">
            {isCompany ? (
              <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
            ) : (
              <User className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
            )}
            <span className="text-[10px] font-semibold text-gray-900 break-words">
              {displayName}
            </span>
          </div>

          {/* Contact Person & Tax ID (same line) */}
          {(customer.contactPerson || customer.taxId) && (
            <div className="flex items-center gap-2 text-[10px] text-gray-700">
              <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>
                {customer.contactPerson && `ผู้ติดต่อ: ${customer.contactPerson}`}
                {customer.contactPerson && customer.taxId && "  "}
                {customer.taxId && `เลขประจำตัวผู้เสียภาษี: ${customer.taxId}`}
              </span>
            </div>
          )}

          {/* Address */}
          {customer.address && (
            <div className="flex items-start gap-2 text-[10px] text-gray-700">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
              <span>{customer.address}</span>
            </div>
          )}

          {/* Phone & Email row */}
          <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1">
            {customer.phone && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-gray-700">
                <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-gray-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-gray-700 min-w-0">
                <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-gray-400" />
                <span className="break-all">{customer.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Document Date & Number */}
      <div className="shrink-0 rounded border border-gray-200 p-2 sm:p-3">
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-1.5 gap-y-1 text-[10px] text-gray-700">
          <span className="font-semibold text-right text-black">วันที่</span>
          <span className="text-black">:</span>
          <span>{formatThaiDate(new Date(documentDate))}</span>
          <span className="font-semibold text-right text-black">เลขที่</span>
          <span className="text-black">:</span>
          <span>{documentNumber}</span>
        </div>
      </div>
    </div>
  );
}
