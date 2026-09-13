import { forwardRef } from "react";

export interface LabelItem {
  /** Unique per printed label; a repeated stockCode with count > 1 becomes multiple LabelItem entries. */
  key: string;
  stockCode: string;
  productName: string;
  colorVariantName?: string | null;
  colorHex?: string | null;
  colorVariantSku?: string | null;
  qrDataUrl: string;
}

interface QrLabelSheetProps {
  items: LabelItem[];
}

const LABELS_PER_PAGE = 12; // 3 cols x 4 rows

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * 12 QR labels per A4 sheet (3x4 grid). Renders one `id="document-preview"`
 * div per page — duplicate ids are the established multi-page pattern here
 * (see src/lib/export-pdf.ts, which iterates them for PDF export). Printing
 * via window.print() only shows the first sheet correctly (see globals.css);
 * multi-sheet selections should use the PDF export button instead.
 */
export const QrLabelSheet = forwardRef<HTMLDivElement, QrLabelSheetProps>(function QrLabelSheet(
  { items },
  ref
) {
  const pages = chunk(items, LABELS_PER_PAGE);
  if (pages.length === 0) {
    return (
      <div
        ref={ref}
        id="document-preview"
        className="mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white p-[8mm] flex items-center justify-center text-muted-foreground"
      >
        เลือกสินค้าเพื่อพิมพ์ QR
      </div>
    );
  }

  return (
    <div ref={ref}>
      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          id="document-preview"
          className="mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white p-[8mm] shadow-lg print:shadow-none"
          style={{ pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto" }}
        >
          <div className="grid grid-cols-3 grid-rows-4 gap-[2mm] h-full">
            {page.map((item) => (
              <div
                key={item.key}
                className="flex flex-col items-center justify-center gap-1 border border-dashed border-gray-300 rounded p-2 text-center overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.qrDataUrl} alt={item.stockCode} className="h-[30mm] w-[30mm] object-contain" />
                <p className="font-mono text-[10px] leading-tight">{item.stockCode}</p>
                <p className="text-[10px] leading-tight line-clamp-2 font-medium">
                  {item.productName}
                </p>
                {item.colorVariantName && (
                  <div className="flex items-center gap-1">
                    {item.colorHex && (
                      <span
                        className="inline-block size-2.5 rounded-full border"
                        style={{ backgroundColor: item.colorHex }}
                      />
                    )}
                    <span className="text-[9px] text-gray-500">
                      {item.colorVariantName}
                      {item.colorVariantSku ? ` (${item.colorVariantSku})` : ""}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
