import { notFound } from "next/navigation";

import { getVendorCostById } from "@/data/vendor-costs";
import { getDocumentById } from "@/data/documents";
import { VendorCostPrintPage } from "@/components/vendor-costs/vendor-cost-print-page";

export const dynamic = "force-dynamic";

interface VendorCostPrintRouteProps {
  params: Promise<{ id: string }>;
}

export default async function VendorCostPrintRoute({
  params,
}: VendorCostPrintRouteProps) {
  const { id } = await params;
  const vendorCost = await getVendorCostById(id);

  if (!vendorCost) {
    notFound();
  }

  // Fetch linked invoice document if exists
  let invoice = null;
  if (vendorCost.document?.id) {
    const doc = await getDocumentById(vendorCost.document.id);
    if (doc) {
      invoice = {
        documentNumber: doc.documentNumber,
        documentDate: String(doc.documentDate),
        grandTotal: Number(doc.grandTotal),
        customerSnapshot: doc.customerSnapshot as {
          customerName?: string;
          companyName?: string;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lineItems: (doc.lineItems ?? []).map((item: any) => ({
          sequence: item.sequence,
          productName: item.productName,
          productSku: item.productSku,
          productImage: item.productImage ?? undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        subtotal: Number(doc.subtotal),
        discountAmount: Number(doc.discountAmount),
        vatEnabled: doc.vatEnabled,
        vatAmount: Number(doc.vatAmount),
        shippingCost: Number(doc.shippingCost ?? 0),
      };
    }
  }

  // Compute profit if invoice is linked
  let profit = null;
  if (invoice) {
    const revenue = invoice.grandTotal;
    const cost = Number(vendorCost.totalCost);
    const profitAmount = revenue - cost;
    const marginPercent = revenue > 0 ? (profitAmount / revenue) * 100 : 0;
    profit = { revenue, cost, profit: profitAmount, marginPercent };
  }

  const data = {
    vendorCost: {
      id: vendorCost.id,
      vendorName: vendorCost.vendorName,
      orderNumber: vendorCost.orderNumber ?? undefined,
      orderDate: String(vendorCost.orderDate),
      exchangeRate: vendorCost.exchangeRate
        ? Number(vendorCost.exchangeRate)
        : undefined,
      shippingCost: Number(vendorCost.shippingCost),
      otherCost: Number(vendorCost.otherCost),
      totalCost: Number(vendorCost.totalCost),
      paymentMethod: vendorCost.paymentMethod,
      shippingPaymentMethod: vendorCost.shippingPaymentMethod,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (vendorCost.items ?? []).map((item: any) => ({
        sequence: item.sequence,
        productName: item.productName,
        productSku: item.productSku ?? undefined,
        productImage: item.productImage ?? undefined,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        unitCostCny: item.unitCostCny ? Number(item.unitCostCny) : undefined,
        lineTotal: Number(item.lineTotal),
      })),
      document: vendorCost.document
        ? {
            documentNumber: vendorCost.document.documentNumber,
            customer: vendorCost.document.customer,
          }
        : undefined,
    },
    invoice,
    profit,
  };

  const filename = `ต้นทุน-${vendorCost.vendorName}${
    vendorCost.orderNumber ? `-${vendorCost.orderNumber}` : ""
  }`;

  return <VendorCostPrintPage data={data} filename={filename} />;
}
