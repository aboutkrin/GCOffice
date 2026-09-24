import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { applyReceiptPayment, lockInvoice, syncInvoicePaymentStatus } from "../src/lib/receipt-payment-server";

const url = process.env.RECEIPT_TEST_DATABASE_URL;
test("PostgreSQL receipt migration, allocations, and concurrent transactions", { skip: !url }, async (t) => {
  const parsed = new URL(url!);
  assert.ok(["localhost", "127.0.0.1"].includes(parsed.hostname), "Use an isolated local database only");
  assert.equal(parsed.username, "receipt_test", "Use the temporary receipt_test database user only");
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await t.test("migration applies to the previous schema without rewriting data", async () => {
      const connection = await pool.connect();
      try {
        await connection.query("BEGIN");
        await connection.query('ALTER TABLE documents DROP COLUMN receipt_payment_type, DROP COLUMN receipt_payment_summary');
        await connection.query('DROP TYPE "ReceiptPaymentType"');
        await connection.query('DROP INDEX documents_source_invoice_id_idx');
        await connection.query(await readFile(new URL("../prisma/migrations/20260924000000_receipt_payments/migration.sql", import.meta.url), "utf8"));
        const result = await connection.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents' AND column_name LIKE 'receipt_payment_%'");
        assert.equal(result.rowCount, 2);
      } finally {
        await connection.query("ROLLBACK");
        connection.release();
      }
    });
    const suffix = randomUUID();
    const profile = await db.profile.create({ data: { id: randomUUID(), email: `${suffix}@example.test` } });
    const company = await db.company.create({ data: { name: "Receipt test", address: "Test" } });
    const customer = await db.customer.create({ data: { code: suffix, type: "INDIVIDUAL", customerName: "Receipt test" } });
    const fields = { documentDate: new Date("2026-08-01"), companyId: company.id, customerId: customer.id,
      companySnapshot: { name: "Receipt test" }, customerSnapshot: { customerName: "Receipt test" }, createdById: profile.id };
    const invoice = await db.document.create({ data: { ...fields, type: "INVOICE", status: "BILLED", documentNumber: `TEST-${suffix}`,
      subtotal: 10000, vatEnabled: true, vatRate: 7, vatAmount: 700, grandTotal: 10700, netPayable: 10700,
      lineItems: { create: { sequence: 1, productName: "Product", quantity: 1, unitPrice: 10000, lineTotal: 10000 } } } });
    await t.test("two overlapping full-payment transactions commit exactly one receipt", async () => {
      let signalLocked!: () => void;
      const firstLocked = new Promise<void>((resolve) => { signalLocked = resolve; });
      const issue = (first: boolean) => db.$transaction(async (tx) => {
        await lockInvoice(tx, invoice.id);
        if (first) { signalLocked(); await new Promise((resolve) => setTimeout(resolve, 100)); }
        const receipt = await tx.document.create({ data: { ...fields, type: "RECEIPT", status: "PAID", sourceInvoiceId: invoice.id } });
        await applyReceiptPayment(tx, receipt.id, { sourceInvoiceId: invoice.id, type: "FULL", amount: 10700 });
        await syncInvoicePaymentStatus(tx, invoice.id);
        return receipt;
      });
      const first = issue(true);
      await firstLocked;
      const results = await Promise.allSettled([first, issue(false)]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const receipts = await db.document.findMany({ where: { sourceInvoiceId: invoice.id } });
      assert.equal(receipts.length, 1, "Rejected transaction must roll back its new receipt");
      assert.equal(Number(receipts[0].netPayable), 10700);
      assert.equal((await db.document.findUniqueOrThrow({ where: { id: invoice.id } })).status, "PAID");
      await db.$transaction(async (tx) => {
        await lockInvoice(tx, invoice.id);
        await tx.document.update({ where: { id: receipts[0].id }, data: { status: "CANCELLED" } });
        await syncInvoicePaymentStatus(tx, invoice.id);
      });
    });
    await t.test("drafts, cross-month deposits, balance and cancellation reconcile", async () => {
      const deposit = await db.$transaction(async (tx) => {
        await lockInvoice(tx, invoice.id);
        const receipt = await tx.document.create({ data: { ...fields, documentDate: new Date("2026-09-01"), type: "RECEIPT", status: "DRAFT", sourceInvoiceId: invoice.id } });
        await applyReceiptPayment(tx, receipt.id, { sourceInvoiceId: invoice.id, type: "DEPOSIT", amount: 3210 });
        return tx.document.findUniqueOrThrow({ where: { id: receipt.id } });
      });
      assert.equal((await db.document.findUniqueOrThrow({ where: { id: invoice.id } })).status, "BILLED");
      await db.$transaction(async (tx) => {
        await lockInvoice(tx, invoice.id);
        await applyReceiptPayment(tx, deposit.id, { sourceInvoiceId: invoice.id, type: "DEPOSIT", amount: 3210 });
        await tx.document.update({ where: { id: deposit.id }, data: { status: "PAID" } });
        await syncInvoicePaymentStatus(tx, invoice.id);
      });
      assert.equal((await db.document.findUniqueOrThrow({ where: { id: invoice.id } })).status, "DEPOSITED");
      const balance = await db.$transaction(async (tx) => {
        await lockInvoice(tx, invoice.id);
        const receipt = await tx.document.create({ data: { ...fields, documentDate: new Date("2026-10-01"), type: "RECEIPT", status: "PAID", sourceInvoiceId: invoice.id } });
        await applyReceiptPayment(tx, receipt.id, { sourceInvoiceId: invoice.id, type: "BALANCE", amount: 7490 });
        await syncInvoicePaymentStatus(tx, invoice.id);
        return tx.document.findUniqueOrThrow({ where: { id: receipt.id }, include: { lineItems: true } });
      });
      assert.equal(Number(balance.vatAmount) + Number(deposit.vatAmount), 700);
      assert.equal(balance.lineItems.length, 1);
      assert.match(balance.lineItems[0].productName, /ยอดคงเหลือ/);
      assert.deepEqual((await db.document.findUniqueOrThrow({ where: { id: deposit.id } })).receiptPaymentSummary, deposit.receiptPaymentSummary);
      assert.equal((await db.document.findUniqueOrThrow({ where: { id: invoice.id } })).status, "PAID");
      await db.$transaction(async (tx) => {
        await lockInvoice(tx, invoice.id);
        await tx.document.update({ where: { id: balance.id }, data: { status: "CANCELLED" } });
        await syncInvoicePaymentStatus(tx, invoice.id);
      });
      assert.equal((await db.document.findUniqueOrThrow({ where: { id: invoice.id } })).status, "DEPOSITED");
    });
  } finally {
    await db.$disconnect();
    await pool.end();
  }
});
