/**
 * Address block printed under the company name. The tax ID goes at the end of
 * the first line, so an address saved as
 *   "บริษัท ... (สำนักงานใหญ่)\n37 แยก 1-3-1 ..."
 * prints the name + tax ID on line 1 and the address on line 2.
 */
export function formatCompanyAddress(address: string | null | undefined, taxId?: string | null) {
  const lines = (address ?? "").split("\n");
  if (taxId) {
    const label = `เลขประจำตัวผู้เสียภาษี: ${taxId}`;
    lines[0] = lines[0].trim() ? `${lines[0].trimEnd()}  ${label}` : label;
  }
  return lines.join("\n");
}
