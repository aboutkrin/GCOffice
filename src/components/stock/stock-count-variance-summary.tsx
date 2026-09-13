import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VarianceLine {
  id: string;
  productName: string;
  colorVariantName: string | null;
  stockCode: string;
  quantity: number;
  liveOnHand: number;
  variance: number;
}

export function StockCountVarianceSummary({ lines }: { lines: VarianceLine[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>สินค้า</TableHead>
            <TableHead className="text-right">นับได้</TableHead>
            <TableHead className="text-right">ระบบ (ปัจจุบัน)</TableHead>
            <TableHead className="text-right">ผลต่าง</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                <p className="font-medium">
                  {line.productName}
                  {line.colorVariantName && (
                    <span className="text-muted-foreground font-normal"> — {line.colorVariantName}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{line.stockCode}</p>
              </TableCell>
              <TableCell className="text-right font-mono">{line.quantity}</TableCell>
              <TableCell className="text-right font-mono">{line.liveOnHand}</TableCell>
              <TableCell
                className={`text-right font-mono font-medium ${
                  line.variance === 0
                    ? "text-muted-foreground"
                    : line.variance > 0
                      ? "text-green-600"
                      : "text-red-600"
                }`}
              >
                {line.variance > 0 ? `+${line.variance}` : line.variance}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
