"use server";

/** Thin client-callable wrappers around src/data/stock-documents.ts read functions. */

export async function getIssuableDocumentsAction(search?: string) {
  const { getIssuableDocuments } = await import("@/data/stock-documents");
  return getIssuableDocuments({ search });
}
