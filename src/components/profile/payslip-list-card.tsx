import Link from "next/link";
import { FileText } from "lucide-react";

import { THAI_MONTHS } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import { PAYROLL_STATUS_COLORS, PAYROLL_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PayslipListItem {
  id: string;
  year: number;
  month: number;
  status: string;
  netPay: number;
  leaveDeduction: number;
}

/** Payslip list — used on /profile (own CONFIRMED slips) and /users/[id] (admin, every status). */
export function PayslipListCard({
  title,
  payslips,
  emptyText,
  hrefFor,
  showStatus = false,
}: {
  title: string;
  payslips: PayslipListItem[];
  emptyText: string;
  hrefFor: (id: string) => string;
  showStatus?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {payslips.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y">
            {payslips.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {THAI_MONTHS[p.month - 1]} {p.year + 543}
                    {showStatus && (
                      <Badge className={cn("border-0", PAYROLL_STATUS_COLORS[p.status])}>
                        {PAYROLL_STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    รับสุทธิ {formatBaht(p.netPay)}
                    {p.leaveDeduction > 0 && ` · หักลา ${formatBaht(p.leaveDeduction)}`}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={hrefFor(p.id)}>
                    <FileText className="size-4" />
                    ดูสลิป
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
