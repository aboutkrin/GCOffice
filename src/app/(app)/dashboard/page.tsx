import Link from "next/link";
import { FileText, Receipt, Clock, Banknote, CircleDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { getDashboardStats, getYearlyStats, getMonthlyRevenueAndCost } from "@/data/dashboard";
import { YearlyStatsCards } from "@/components/dashboard/yearly-stats-cards";
import { RevenueExpenseSection } from "@/components/dashboard/revenue-expense-section";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate, getThaiNow } from "@/lib/thai-date";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { year: currentYear, month: currentMonth } = getThaiNow();
  const [stats, yearlyStats, revenueExpense] = await Promise.all([
    getDashboardStats(),
    getYearlyStats(currentYear),
    getMonthlyRevenueAndCost(currentYear),
  ]);

  const monthParams = `year=${currentYear}&month=${currentMonth}`;

  const thisMonthCards = [
    {
      title: "ใบเสนอราคาเดือนนี้",
      value: stats.thisMonthQuotations.toLocaleString(),
      icon: FileText,
      href: `/quotations?${monthParams}&excludeStatus=DRAFT`,
    },
    {
      title: "รอดำเนินการเดือนนี้",
      value: stats.thisMonthPendingDocuments.toLocaleString(),
      icon: Clock,
      href: `/quotations?${monthParams}&status=QUOTED,BILLED`,
    },
    {
      title: "รอเรียกเก็บเดือนนี้",
      value: stats.thisMonthPendingCollection.toLocaleString(),
      icon: CircleDollarSign,
      href: `/invoices?${monthParams}&status=DEPOSITED`,
    },
    {
      title: "ใบแจ้งหนี้เดือนนี้",
      value: stats.thisMonthInvoices.toLocaleString(),
      icon: Receipt,
      href: `/invoices?${monthParams}&status=PAID`,
    },
    {
      title: "ยอดรวมเดือนนี้",
      value: formatBaht(stats.thisMonthConfirmedTotal),
      icon: Banknote,
      href: `/invoices?${monthParams}&status=PAID,DEPOSITED`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมเอกสารและข้อมูลสรุป"
      />

      {/* This Month Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">เดือนนี้</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
          {thisMonthCards.map((card, index) => (
            <Link
              key={card.title}
              href={card.href}
              className={index === thisMonthCards.length - 1 ? "col-span-2 lg:col-span-1" : ""}
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <card.icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-lg md:text-2xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Yearly Stats */}
      <YearlyStatsCards initialData={yearlyStats} />

      {/* Revenue & Expense + Profit Charts */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">ภาพรวมรายรับและรายจ่ายตลอดทั้งปี</h2>
        <RevenueExpenseSection initialData={revenueExpense} />
      </div>

      {/* Recent Documents */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">เอกสารล่าสุด</h2>

        {stats.recentDocuments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            ยังไม่มีเอกสาร
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่เอกสาร</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead className="text-right">ยอดรวม</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentDocuments.map((doc) => {
                      const snapshot = doc.customerSnapshot as Record<string, unknown>;
                      const customerName =
                        (snapshot?.customerName as string) ||
                        (snapshot?.companyName as string) ||
                        "-";

                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            {doc.documentNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{customerName}</TableCell>
                          <TableCell>
                            {formatThaiDate(new Date(doc.documentDate), "short")}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatBaht(doc.grandTotal.toString())}
                          </TableCell>
                          <TableCell>
                            <DocumentStatusBadge status={doc.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {stats.recentDocuments.map((doc) => {
                const snapshot = doc.customerSnapshot as Record<string, unknown>;
                const customerName =
                  (snapshot?.customerName as string) ||
                  (snapshot?.companyName as string) ||
                  "-";

                return (
                  <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{doc.documentNumber}</span>
                      <DocumentStatusBadge status={doc.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="text-xs">
                        {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                      </Badge>
                      <span className="font-semibold">
                        {formatBaht(doc.grandTotal.toString())}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{customerName}</span>
                      <span>{formatThaiDate(new Date(doc.documentDate), "short")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
