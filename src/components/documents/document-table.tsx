"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentStatusBadge } from "./document-status-badge";
import { deleteDocument, updateDocumentStatus } from "@/actions/document-actions";
import { formatThaiDate } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  QUOTATION_STATUS_OPTIONS,
  INVOICE_STATUS_OPTIONS,
} from "@/lib/constants";
import { Pencil, Eye, Trash2, ChevronDown, Share2, MoreHorizontal } from "lucide-react";

interface DocumentTableProps {
  documents: any[];
  basePath: string; // "/quotations" or "/invoices"
  documentType: "QUOTATION" | "INVOICE";
}

export function DocumentTable({ documents, basePath, documentType }: DocumentTableProps) {
  const STATUS_OPTIONS = documentType === "QUOTATION" ? QUOTATION_STATUS_OPTIONS : INVOICE_STATUS_OPTIONS;
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (docId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateDocumentStatus(docId, newStatus as any);
        toast.success(
          `เปลี่ยนสถานะเป็น "${DOCUMENT_STATUS_LABELS[newStatus]}" สำเร็จ`
        );
      } catch (error) {
        console.error("Status update failed:", error);
        toast.error("ไม่สามารถเปลี่ยนสถานะได้");
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error("ลบเอกสารไม่สำเร็จ:", error);
    } finally {
      setDeleting(false);
    }
  };

  const getCustomerName = (doc: any) => {
    if (doc.customerSnapshot && typeof doc.customerSnapshot === "object") {
      const snapshot = doc.customerSnapshot as any;
      if (snapshot.type === "COMPANY" && snapshot.companyName) {
        return snapshot.companyName;
      }
      return snapshot.customerName || snapshot.companyName || "-";
    }
    return "-";
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        ยังไม่มีเอกสาร
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead>ลูกค้า</TableHead>
              <TableHead className="text-right">ยอดรวม</TableHead>
              <TableHead className="text-center">สถานะ</TableHead>
              <TableHead className="w-[160px] text-center">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {doc.documentNumber}
                </TableCell>
                <TableCell>
                  {formatThaiDate(new Date(doc.documentDate), "short")}
                </TableCell>
                <TableCell>{getCustomerName(doc)}</TableCell>
                <TableCell className="text-right">
                  {formatBaht(doc.grandTotal)}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center gap-1 cursor-pointer rounded-full transition-opacity hover:opacity-80"
                        disabled={isPending}
                      >
                        <DocumentStatusBadge status={doc.status} />
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      {STATUS_OPTIONS.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          disabled={status === doc.status}
                          onClick={() => handleStatusChange(doc.id, status)}
                        >
                          <Badge
                            className={`${DOCUMENT_STATUS_COLORS[status]} text-xs pointer-events-none`}
                          >
                            {DOCUMENT_STATUS_LABELS[status]}
                          </Badge>
                          {status === doc.status && (
                            <span className="ml-2 text-xs text-gray-400">
                              (ปัจจุบัน)
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="แก้ไข"
                      onClick={() => router.push(`${basePath}/${doc.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="ดูตัวอย่าง"
                      onClick={() => router.push(`${basePath}/${doc.id}/preview`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="แชร์"
                      onClick={() => router.push(`${basePath}/${doc.id}/preview`)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="ลบ"
                      onClick={() => setDeleteId(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="border rounded-lg p-4 space-y-2"
            onClick={() => router.push(`${basePath}/${doc.id}`)}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{doc.documentNumber}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center gap-1 cursor-pointer rounded-full transition-opacity hover:opacity-80"
                      disabled={isPending}
                    >
                      <DocumentStatusBadge status={doc.status} />
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        disabled={status === doc.status}
                        onClick={() => handleStatusChange(doc.id, status)}
                      >
                        <Badge
                          className={`${DOCUMENT_STATUS_COLORS[status]} text-xs pointer-events-none`}
                        >
                          {DOCUMENT_STATUS_LABELS[status]}
                        </Badge>
                        {status === doc.status && (
                          <span className="ml-2 text-xs text-gray-400">
                            (ปัจจุบัน)
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`${basePath}/${doc.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      ดู / แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`${basePath}/${doc.id}/preview`)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      แชร์
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteId(doc.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      ลบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatThaiDate(new Date(doc.documentDate), "short")}
              </span>
              <span className="font-semibold">
                {formatBaht(doc.grandTotal)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getCustomerName(doc)}
            </p>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบเอกสาร</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบเอกสารนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "กำลังลบ..." : "ลบเอกสาร"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
