"use client";

export interface PreviewProductImageItem {
  productImage?: string | null;
  productName: string;
  colorVariantName?: string | null;
}

interface PreviewProductImagesProps {
  items?: PreviewProductImageItem[] | null;
}

/**
 * "รูปสินค้า" box printed on deposit / balance receipts, whose only line is
 * "รับชำระ… ตามใบแจ้งหนี้…": thumbnails of the invoice's products so the reader
 * can tell which goods the payment is for. One thumbnail per distinct image.
 */
export function PreviewProductImages({ items }: PreviewProductImagesProps) {
  const seen = new Set<string>();
  const shown = (items || []).filter((item) => {
    if (!item.productImage || seen.has(item.productImage)) return false;
    seen.add(item.productImage);
    return true;
  });
  if (shown.length === 0) return null;

  return (
    <div className="mb-3 rounded border border-gray-300 p-2">
      <div className="mb-1.5 text-[11px] font-semibold">รูปสินค้า</div>
      <div className="flex flex-wrap gap-3">
        {shown.map((item) => (
          <div key={item.productImage!} className="flex w-16 flex-col items-center gap-1">
            <div className="h-14 w-14 overflow-hidden rounded border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.productImage!} alt={item.productName} className="h-full w-full object-cover" />
            </div>
            <div className="w-full text-center text-[9px] leading-tight text-gray-700">
              <div className="line-clamp-2">{item.productName}</div>
              {item.colorVariantName && <div className="text-gray-500">{item.colorVariantName}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
