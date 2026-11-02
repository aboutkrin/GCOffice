import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildInvoiceBillingChoices, calculateInvoiceBilling as calculate, invoiceBillingLineName, invoiceBillingPercentLabel, invoiceBillingTitle, satang,
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
  assert.equal(
    invoiceBillingLineName("DEPOSIT", "QT-6910-0019", { amount: 61050, quotationTotal: 610500 }),
    "เรียกเก็บเงินมัดจำ 10% ตามใบเสนอราคาเลขที่ QT-6910-0019",
  );
  assert.equal(
    invoiceBillingLineName("DEPOSIT", "QT-6910-0019", { amount: 3333.33, quotationTotal: 10000 }),
    "เรียกเก็บเงินมัดจำ 33.33% ตามใบเสนอราคาเลขที่ QT-6910-0019",
  );
  assert.equal(
    invoiceBillingLineName("BALANCE", "QT-6910-0019", { amount: 549450, quotationTotal: 610500 }),
    "เรียกเก็บยอดคงเหลือ 90% ตามใบเสนอราคาเลขที่ QT-6910-0019",
  );
});

test("deposit percent label", () => {
  assert.equal(invoiceBillingPercentLabel(5000, 10000), "50%");
  assert.equal(invoiceBillingPercentLabel(1250, 10000), "12.5%");
  assert.equal(invoiceBillingPercentLabel(61050, 610500), "10%");
  assert.equal(invoiceBillingPercentLabel(0, 10000), null);
  assert.equal(invoiceBillingPercentLabel(100, 0), null);
});

test("choices for the first invoice: full, one deposit per term except the last, custom; first term recommended", () => {
  const terms = [{ name: "มัดจำ 30%", calculatedAmount: 3000 }, { name: "ก่อนส่ง 70%", calculatedAmount: 7000 }];
  const choices = buildInvoiceBillingChoices({ quotationTotal: 10000, previousDeposits: 0, paymentTerms: terms });
  assert.deepEqual(choices.map((c) => [c.key, c.type, c.amount, c.percent, c.recommended]), [
    ["FULL", "FULL", 10000, "100%", false],
    ["TERM:0", "DEPOSIT", 3000, "30%", true],
    ["CUSTOM", "DEPOSIT", null, null, false],
  ]);
  assert.equal(choices[1].detail, "งวด 1 · มัดจำ 30%");
});

test("choices after a deposit: the balance is recommended and FULL is gone", () => {
  const terms = [{ name: "มัดจำ 30%", calculatedAmount: 3000 }, { name: "ก่อนส่ง 70%", calculatedAmount: 7000 }];
  const choices = buildInvoiceBillingChoices({ quotationTotal: 10000, previousDeposits: 3000, paymentTerms: terms });
  assert.deepEqual(choices.map((c) => [c.key, c.type, c.amount, c.percent, c.recommended]), [
    ["BALANCE", "BALANCE", 7000, "70%", true],
    ["CUSTOM", "DEPOSIT", null, null, false],
  ]);
  assert.equal(choices[0].detail, "งวด 2 · ก่อนส่ง 70%");
});

test("choices with three terms and the first deposit billed offer the second term as an extra deposit", () => {
  const terms = [
    { name: "มัดจำ 30%", calculatedAmount: 3000 }, { name: "งวด 2 30%", calculatedAmount: 3000 }, { name: "ส่งมอบ 40%", calculatedAmount: 4000 },
  ];
  const choices = buildInvoiceBillingChoices({ quotationTotal: 10000, previousDeposits: 3000, paymentTerms: terms });
  assert.deepEqual(choices.map((c) => [c.key, c.amount, c.recommended]), [["BALANCE", 7000, true], ["TERM:1", 3000, false], ["CUSTOM", null, false]]);
  assert.equal(choices[0].detail, undefined);
  assert.equal(choices[1].label, "มัดจำเพิ่ม");
});

test("choices without terms or with a single term: full and a custom deposit, nothing recommended", () => {
  for (const terms of [[], [{ name: "ชำระเต็ม", calculatedAmount: 10000 }]]) {
    const choices = buildInvoiceBillingChoices({ quotationTotal: 10000, previousDeposits: 0, paymentTerms: terms });
    assert.deepEqual(choices.map((c) => [c.key, c.recommended]), [["FULL", false], ["CUSTOM", false]]);
  }
  assert.deepEqual(buildInvoiceBillingChoices({ quotationTotal: 10000, previousDeposits: 10000, paymentTerms: [] }), []);
});
