"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
interface PaymentTermTemplateSelectProps {
  templates: any[];
  hasExistingTerms: boolean;
  onApply: (templateItems: any[]) => void;
}

export function PaymentTermTemplateSelect({
  templates,
  hasExistingTerms,
  onApply,
}: PaymentTermTemplateSelectProps) {
  const [pendingTemplate, setPendingTemplate] = useState<any | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (templates.length === 0) return null;

  function handleSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (hasExistingTerms) {
      setPendingTemplate(template);
      setConfirmOpen(true);
    } else {
      onApply(template.items);
    }
  }

  function handleConfirm() {
    if (pendingTemplate) {
      onApply(pendingTemplate.items);
    }
    setConfirmOpen(false);
    setPendingTemplate(null);
  }

  return (
    <>
      <Select onValueChange={handleSelect} value="">
        <SelectTrigger className="w-[220px] h-9">
          <SelectValue placeholder="เลือกจากเทมเพลต..." />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} ({t.items.length} งวด)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>แทนที่เงื่อนไขชำระเงิน?</AlertDialogTitle>
            <AlertDialogDescription>
              มีเงื่อนไขชำระเงินอยู่แล้ว ต้องการแทนที่ด้วยเทมเพลต &quot;{pendingTemplate?.name}&quot; หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTemplate(null)}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              แทนที่
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
