import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateInvoiceBilling as calculate, invoiceBillingLineName, invoiceBillingTitle, satang,
} from "../src/lib/invoice-billing";

test("deposit invoices and the balance invoice reconcile to the quotation total and VAT", () => {
  const quotation = { total: 10700, quotationVat: 700, vatRate: 7 };
  const deposit = calculate({ ...quotation, issued: 0, issuedVat: 0, type: "DEPOSIT", requested: 3210 });
  assert.deepEqual(deposit, { amount: 3210, vat: 210, base: 3000, remaining: 7490 });
  const balance = calculate({ ...quotation, issued: deposit.amount, issuedVat: deposit.vat, type: "BALANCE", requested: 7490 });
  assert.equal(satang(deposit.vat) + satang(balance.vat), satang(700));
  assert.equal(satang(deposit.base) + satang(balance.base), satang(10000));
  assert.equal(balance.remaining, 0);
});

test("several deposits: the balance absorbs the VAT rounding", () => {
  const quotation = { total: 103388.22, quotationVat: 6763.72, vatRate: 7 };
  let issued = 0, issuedVat = 0;
  for (const amount of [31016.46, 20000]) {
    const d = calculate({ ...quotation, issued, issuedVat, type: "DEPOSIT", requested: amount });
    issued = (satang(issued) + satang(d.amount)) / 100;
    issuedVat = (satang(issuedVat) + satang(d.vat)) / 100;
  }
  const balance = calculate({ ...quotation, issued, issuedVat, type: "BALANCE", requested: (satang(103388.22) - satang(issued)) / 100 });
  assert.equal(satang(issuedVat) + satang(balance.vat), satang(6763.72));
  assert.equal(satang(issued) + satang(balance.amount), satang(103388.22));
});

test("rejects a full invoice after a deposit, a stale balance and over-billing, with invoice wording", () => {
  const quotation = { total: 10000, quotationVat: 0, vatRate: 0 };
  assert.throws(
    () => calculate({ ...quotation, issued: 3000, issuedVat: 0, type: "FULL", requested: 7000 }),
    /ใบเสนอราคาที่ยังไม่มีใบแจ้งหนี้มัดจำ/,
  );
  assert.throws(
    () => calculate({ ...quotation, issued: 3000, issuedVat: 0, type: "BALANCE", requested: 6000 }),
    /ยอดคงเหลือของใบเสนอราคาเปลี่ยนแปลง/,
  );
  assert.throws(
    () => calculate({ ...quotation, issued: 3000, issuedVat: 0, type: "DEPOSIT", requested: 7000.01 }),
    /ยอดเรียกเก็บต้องมากกว่า 0/,
  );
  assert.throws(() => calculate({ ...quotation, issued: 0, issuedVat: 0, type: "BALANCE", requested: 10000 }));
  assert.deepEqual(
    calculate({ ...quotation, issued: 0, issuedVat: 0, type: "FULL", requested: 10000 }),
    { amount: 10000, vat: 0, base: 10000, remaining: 0 },
  );
});

test("titles and generated line names", () => {
  assert.equal(invoiceBillingTitle("DEPOSIT"), "ใบแจ้งหนี้มัดจำ");
  assert.equal(invoiceBillingTitle("BALANCE"), "ใบแจ้งหนี้ยอดคงเหลือ");
  assert.equal(invoiceBillingTitle("FULL"), "ใบแจ้งหนี้");
  assert.equal(invoiceBillingTitle(null), "ใบแจ้งหนี้");
  assert.equal(invoiceBillingLineName("DEPOSIT", "QT-6910-0001"), "เรียกเก็บเงินมัดจำ ตามใบเสนอราคาเลขที่ QT-6910-0001");
});
