import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateLeaveYear, formatLeaveHours } from "../src/lib/leave-policy";
import { calculatePayroll } from "../src/lib/payroll";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const leave = (type: string, start: string, end = start, period = "FULL_DAY") => ({
  type,
  period,
  startDate: d(start),
  endDate: d(end),
});

test("sick leave beyond 30 working days is unpaid", () => {
  // 2026-01-05 (Mon) .. 2026-02-11: 33 working days (Mon–Sat)
  const r = allocateLeaveYear({ year: 2026, leaves: [leave("SICK", "2026-01-05", "2026-02-11")], holidays: [] });
  const sick = r.balances.SICK;
  assert.equal(sick.usedHours, 33 * 8);
  assert.equal(sick.paidHours, 30 * 8);
  assert.equal(sick.unpaidHours, 3 * 8);
  assert.equal(sick.remainingHours, 0);
  // Sundays are skipped
  assert.ok(r.days.every((x) => new Date(x.date).getUTCDay() !== 0));
});

test("half days consume quota by the hour; 4th personal day is unpaid", () => {
  const r = allocateLeaveYear({
    year: 2026,
    leaves: [
      leave("PERSONAL", "2026-03-02", "2026-03-02", "MORNING"), // 3h
      leave("PERSONAL", "2026-03-03", "2026-03-05"), // 24h
    ],
    holidays: [],
  });
  const p = r.balances.PERSONAL;
  assert.equal(p.usedHours, 27);
  assert.equal(p.paidHours, 24);
  assert.equal(p.unpaidHours, 3);
  const last = r.days.at(-1)!;
  assert.equal(last.date, "2026-03-05");
  assert.equal(last.paidHours, 5);
  assert.equal(last.unpaidHours, 3);
  assert.equal(formatLeaveHours(27), "3 วัน 3 ชม.");
});

test("annual leave before the first anniversary is unpaid", () => {
  const r = allocateLeaveYear({
    year: 2026,
    leaves: [leave("ANNUAL", "2026-03-02"), leave("ANNUAL", "2026-07-01")],
    holidays: [],
    annualLeaveDays: 10,
    startDate: d("2025-06-15"),
  });
  assert.equal(r.annualEligibleFrom, "2026-06-15");
  assert.equal(r.days[0].unpaidHours, 8);
  assert.equal(r.days[1].paidHours, 8);
  assert.equal(r.balances.ANNUAL.quotaHours, 80);
  // the unpaid day before the anniversary does not use up the entitlement
  assert.equal(r.balances.ANNUAL.remainingHours, 72);
});

test("no annual quota when the anniversary is after the year", () => {
  const r = allocateLeaveYear({ year: 2026, leaves: [], holidays: [], startDate: d("2026-02-01") });
  assert.equal(r.balances.ANNUAL.quotaHours, 0);
});

test("maternity counts calendar days and pays 60", () => {
  const r = allocateLeaveYear({
    year: 2026,
    leaves: [leave("MATERNITY", "2026-01-01", "2026-04-30")], // 120 days
    holidays: [{ date: d("2026-01-01"), isRecurring: true }],
  });
  const m = r.balances.MATERNITY;
  assert.equal(m.usedHours, 120 * 8);
  assert.equal(m.paidHours, 60 * 8);
  assert.equal(m.unpaidHours, 60 * 8);
});

test("company holidays inside working-day leave are skipped", () => {
  const r = allocateLeaveYear({
    year: 2026,
    leaves: [leave("SICK", "2026-04-13", "2026-04-15")],
    holidays: [{ date: d("2025-04-14"), isRecurring: true }],
  });
  assert.deepEqual(r.days.map((x) => x.date), ["2026-04-13", "2026-04-15"]);
});

test("payroll deducts only leave beyond the quota, remembering earlier months", () => {
  const leaves = [
    leave("PERSONAL", "2026-01-05", "2026-01-06"), // Jan: 2 paid days
    leave("PERSONAL", "2026-03-02", "2026-03-03"), // Mar: 1 paid + 1 unpaid
    leave("SICK", "2026-03-04"), // paid
    leave("OTHER", "2026-03-05"), // unpaid
  ];
  const r = calculatePayroll({ year: 2026, month: 3, monthlySalary: 24000, leaves, holidays: [] });
  assert.equal(r.leaveHours, 32);
  assert.equal(r.unpaidLeaveHours, 16);
  assert.equal(r.leaveDeduction, 1600); // 24000/30/8 = 100 per hour
  assert.equal(r.leaveDetails.length, 4);
  assert.equal(r.netPay, 22400);
});
