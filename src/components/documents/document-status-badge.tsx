import { Badge } from "@/components/ui/badge";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from "@/lib/constants";

export function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={DOCUMENT_STATUS_COLORS[status] || ""}>
      {DOCUMENT_STATUS_LABELS[status] || status}
    </Badge>
  );
}
