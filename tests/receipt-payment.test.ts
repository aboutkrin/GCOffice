import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateReceiptPayment as calculate, satang } from "../src/lib/receipt-payment";
import { applyReceiptPayment, lockInvoice, syncInvoicePaymentStatus } from "../src/lib/receipt-payment-server";
import type { Prisma } from "../src/generated/prisma/client";

test("full payment and deposit/balance allocate the same total and VAT", () => {
  const full = calculate({ total: 10700, invoiceVat: 700, paid: 0, paidVat: 0, type: "FULL", requested: 10700 });
  assert.deepEqual(full, { amount: 10700, vat: 700, base: 10000, remaining: 0 });
  const deposit = calculate({ total: 10700, invoiceVat: 700, paid: 0, paidVat: 0, type: "DEPOSIT", requested: 3210 });
  const balance = calculate({ total: 10700, invoiceVat: 700, paid: deposit.amount, paidVat: deposit.vat, type: "BALANCE", requested: 7490 });
  assert.equal(deposit.vat + balance.vat, 700);
  assert.equal(deposit.base + balance.base, 10000);
  assert.equal(balance.remaining, 0);
});

test("multiple deposits reconcile rounding on the last receipt", () => {
  let paid = 0, paidVat = 0;
  for (const amount of [33.33, 33.33, 33.34]) {
    const result = calculate({ total: 100, invoiceVat: 6.54, paid, paidVat, type: paid > 66 ? "BALANCE" : "DEPOSIT", requested: amount });
    paid = (satang(paid) + satang(result.amount)) / 100;
    paidVat = (satang(paidVat) + satang(result.vat)) / 100;
  }
  assert.equal(paid, 100);
  assert.equal(paidVat, 6.54);
});

test("rejects invalid amounts, duplicate full payments and stale balances", () => {
  const base = { total: 10000, invoiceVat: 0, paid: 3000, paidVat: 0 };
  for (const requested of [0, -1, NaN, Infinity, 7000.01]) {
    assert.throws(() => calculate({ ...base, type: "DEPOSIT", requested }));
  }
  assert.throws(() => calculate({ ...base, type: "FULL", requested: 7000 }));
  assert.throws(() => calculate({ ...base, type: "BALANCE", requested: 6000 }));
  assert.throws(() => calculate({ ...base, paid: 0, type: "BALANCE", requested: 10000 }));
  assert.equal(calculate({ ...base, type: "BALANCE", requested: 7000 }).remaining, 0);
});

// Persistence harness exercises the server helpers without a production database.
function fixture() {
  type Row = Record<string, unknown> & { id: string; type: string; status: string; netPayable: number; vatAmount: number; sourceInvoiceId?: string };
  const rows: Row[] = [{ id: "inv", type: "INVOICE", status: "BILLED", netPayable: 10700, grandTotal: 10700, vatAmount: 700,
    subtotal: 10000, depositDeduction: 0, documentNumber: "INV-TEST", companyId: "company", customerId: "customer",
    companySnapshot: {}, customerSnapshot: {}, vatEnabled: true, vatRate: 7, lineItems: [] }];
  const locks: unknown[] = [];
  const client = {
    $queryRaw: async (...args: unknown[]) => { locks.push(args); },
    document: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const row = rows.find((r) => r.id === where.id); if (!row) throw Error("missing"); return { ...row };
      },
      findMany: async ({ where }: { where: { sourceInvoiceId: string; status: string; type: string; id?: { not: string } } }) => rows.filter((r) => r.sourceInvoiceId === where.sourceInvoiceId && r.status === where.status && r.type === where.type && r.id !== where.id?.not),
      update: async ({ where, data }: { where: { id: string }; data: object }) => Object.assign(rows.find((r) => r.id === where.id)!, data),
    },
    documentLineItem: { deleteMany: async () => {}, createMany: async () => {} },
    documentPaymentTerm: { deleteMany: async () => {} },
    documentDepositDeduction: { deleteMany: async () => {} },
  };
  const tx = client as unknown as Prisma.TransactionClient;
  const add = (id: string, amount: number, status = "PAID") => rows.push({ id, type: "RECEIPT", status, sourceInvoiceId: "inv", netPayable: amount, vatAmount: 0 });
  return { rows, tx, locks, add };
}

test("drafts do not count; issuance, cancellation and restoration update invoice status", async () => {
  const { tx, rows, add } = fixture();
  add("draft", 3210, "DRAFT");
  await syncInvoicePaymentStatus(tx, "inv"); assert.equal(rows[0].status, "BILLED");
  rows[1].status = "PAID";
  await syncInvoicePaymentStatus(tx, "inv"); assert.equal(rows[0].status, "DEPOSITED");
  add("balance", 7490);
  await syncInvoicePaymentStatus(tx, "inv"); assert.equal(rows[0].status, "PAID");
  rows[1].status = "CANCELLED";
  await syncInvoicePaymentStatus(tx, "inv"); assert.equal(rows[0].status, "DEPOSITED");
  rows[1].status = "PAID";
  await syncInvoicePaymentStatus(tx, "inv"); assert.equal(rows[0].status, "PAID");
  rows[1].status = rows[2].status = "CANCELLED";
  await syncInvoicePaymentStatus(tx, "inv"); assert.equal(rows[0].status, "BILLED");
});

test("stored receipt summaries survive later payments and metadata edits", async () => {
  const { tx, rows, add } = fixture();
  add("deposit", 3210);
  await applyReceiptPayment(tx, "deposit", { sourceInvoiceId: "inv", type: "DEPOSIT", amount: 3210 });
  const snapshot = structuredClone(rows[1].receiptPaymentSummary);
  add("balance", 7490);
  await applyReceiptPayment(tx, "balance", { sourceInvoiceId: "inv", type: "BALANCE", amount: 7490 });
  await applyReceiptPayment(tx, "deposit", { sourceInvoiceId: "inv", type: "DEPOSIT", amount: 3210 }, true);
  assert.deepEqual(rows[1].receiptPaymentSummary, snapshot);
  assert.equal(rows[1].vatAmount + rows[2].vatAmount, 700);
});

test("locks target the parent invoice and a second stale payment is rejected", async () => {
  const { tx, locks, add } = fixture();
  await lockInvoice(tx, "inv");
  assert.equal(locks.length, 1);
  assert.equal((locks[0] as unknown[])[1], "inv");
  add("first", 10700);
  await applyReceiptPayment(tx, "first", { sourceInvoiceId: "inv", type: "FULL", amount: 10700 });
  add("second", 10700, "DRAFT");
  await assert.rejects(applyReceiptPayment(tx, "second", { sourceInvoiceId: "inv", type: "FULL", amount: 10700 }));
});

test("legacy receipts count by payable amount and cancelled invoices reject payment", async () => {
  const { tx, rows, add } = fixture();
  add("legacy", 3000);
  await syncInvoicePaymentStatus(tx, "inv"); assert.equal(rows[0].status, "DEPOSITED");
  rows[0].status = "CANCELLED";
  await assert.rejects(syncInvoicePaymentStatus(tx, "inv"));
  add("new", 1000, "DRAFT");
  await assert.rejects(applyReceiptPayment(tx, "new", { sourceInvoiceId: "inv", type: "DEPOSIT", amount: 1000 }));
});

test("restoring an old receipt rejects an invoice whose payable amount changed", async () => {
  const { tx, rows, add } = fixture();
  add("deposit", 3210);
  await applyReceiptPayment(tx, "deposit", { sourceInvoiceId: "inv", type: "DEPOSIT", amount: 3210 });
  rows[1].status = "CANCELLED";
  rows[0].netPayable = 12000;
  await assert.rejects(applyReceiptPayment(tx, "deposit", { sourceInvoiceId: "inv", type: "DEPOSIT", amount: 3210 }, true), /ใบแจ้งหนี้เปลี่ยนแปลง/);
});
