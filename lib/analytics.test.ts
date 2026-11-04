import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { creditCardBillHistories, creditCardCycleSummaries } from "@/lib/analytics"
import { statementPeriod } from "@/lib/credit-card"
import type { PaymentMode, Transaction } from "@/lib/types"

const card: PaymentMode = {
  PaymentModeID: "card",
  Name: "Card",
  Kind: "CreditCard",
  StatementDay: 17,
  DueDays: 20,
}

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    TxID: "t",
    Date: "2026-10-01",
    Amount: 100,
    Type: "Expense",
    CategoryID: "c",
    CategoryName: "C",
    AddedBy: "User1",
    Note: "",
    IsRecurring: false,
    PaymentModeID: "card",
    PaymentModeName: "Card",
    EventID: "",
    EventName: "",
    BillDate: "",
    ...overrides,
  }
}

// Oct 18 2026: the Oct 17 statement (due Nov 6) has just closed.
const NOW = new Date(2026, 9, 18)

function history(transactions: Transaction[], now = NOW, modes = [card]) {
  return creditCardBillHistories(transactions, modes, now)
}

describe("statementPeriod", () => {
  it("spans the day after the previous statement through the statement", () => {
    assert.deepEqual(statementPeriod("2026-11-06", card), { start: "2026-09-18", end: "2026-10-17" })
  })

  it("handles a statement day clamped to a short month", () => {
    const eom = { StatementDay: 31, DueDays: 20 }
    assert.deepEqual(statementPeriod("2026-03-20", eom), { start: "2026-02-01", end: "2026-02-28" })
    assert.deepEqual(statementPeriod("2026-04-20", eom), { start: "2026-03-01", end: "2026-03-31" })
  })

  it("is null for a date that doesn't fit the cycle or an unconfigured card", () => {
    assert.equal(statementPeriod("2026-11-07", card), null)
    assert.equal(statementPeriod("2026-11-06", { StatementDay: 0, DueDays: 0 }), null)
  })
})

describe("creditCardBillHistories", () => {
  it("keeps a cycle after it rolls over and reports its status over time", () => {
    const txs = [tx({ BillDate: "2026-11-06", Amount: 500 })]

    const before = history(txs, new Date(2026, 9, 17))[0].bills
    assert.deepEqual(before.map((b) => [b.dueDate, b.status]), [["2026-11-06", "open"]])

    const closed = history(txs, NOW)[0].bills
    assert.deepEqual(closed.map((b) => [b.dueDate, b.status]), [
      ["2026-12-07", "open"],
      ["2026-11-06", "due"],
    ])
    assert.equal(closed[1].amount, 500)
    assert.equal(closed[1].daysUntilDue, 19)

    const afterDue = history(txs, new Date(2026, 10, 7))[0].bills
    assert.equal(afterDue.find((b) => b.dueDate === "2026-11-06")?.status, "past")
  })

  it("matches the dashboard's current-cycle amount", () => {
    const txs = [
      tx({ BillDate: "2026-12-07", Amount: 250 }),
      tx({ BillDate: "2026-12-07", Amount: 40, Type: "Income" }),
      tx({ BillDate: "2026-11-06", Amount: 999 }),
    ]
    const open = history(txs)[0].bills.find((b) => b.status === "open")
    assert.equal(open?.amount, creditCardCycleSummaries(txs, [card], NOW)[0].amount)
    assert.equal(open?.amount, 250)
    assert.equal(open?.credits, 40)
  })

  it("lists the open cycle before any spend on it", () => {
    const [{ bills }] = history([])
    assert.equal(bills.length, 1)
    assert.equal(bills[0].status, "open")
    assert.equal(bills[0].amount, 0)
  })

  it("places rows with no BillDate by purchase date", () => {
    const [{ bills }] = history([tx({ Date: "2026-05-10", BillDate: "" })])
    assert.equal(bills[1].dueDate, "2026-06-06")
    assert.equal(bills[1].status, "past")
    assert.equal(bills[1].transactions.length, 1)
  })

  it("keeps a hand-edited bill date as its own bill, without a statement period", () => {
    const [{ bills }] = history([tx({ BillDate: "2026-07-15" })])
    assert.equal(bills[1].dueDate, "2026-07-15")
    assert.equal(bills[1].period, null)
  })

  it("sorts newest first and marks bills beyond the open cycle as upcoming", () => {
    const [{ bills }] = history([
      tx({ BillDate: "2026-08-06" }),
      tx({ BillDate: "2027-01-06" }),
      tx({ BillDate: "2026-09-06" }),
    ])
    assert.deepEqual(
      bills.map((b) => [b.dueDate, b.status]),
      [
        ["2027-01-06", "upcoming"],
        ["2026-12-07", "open"],
        ["2026-09-06", "past"],
        ["2026-08-06", "past"],
      ]
    )
  })

  it("ignores other payment modes and non-card modes", () => {
    const cash: PaymentMode = { ...card, PaymentModeID: "cash", Kind: "Ordinary" }
    const result = history([tx({ PaymentModeID: "cash", BillDate: "2026-11-06" })], NOW, [card, cash])
    assert.equal(result.length, 1)
    assert.equal(result[0].bills.length, 1)
  })

  it("marks only closed bills as paid", () => {
    const txs = [tx({ BillDate: "2026-11-06" }), tx({ BillDate: "2026-09-06" })]
    const paid = new Set(["card:2026-11-06", "card:2026-12-07"])
    const [{ bills }] = creditCardBillHistories(txs, [card], NOW, paid)
    assert.deepEqual(
      bills.map((b) => [b.dueDate, b.status, b.paid]),
      [
        ["2026-12-07", "open", false],
        ["2026-11-06", "due", true],
        ["2026-09-06", "past", false],
      ]
    )
  })

  it("defaults every bill to unpaid and keeps paid scoped to its card", () => {
    const other: PaymentMode = { ...card, PaymentModeID: "other" }
    const txs = [
      tx({ BillDate: "2026-09-06" }),
      tx({ PaymentModeID: "other", BillDate: "2026-09-06" }),
    ]
    assert.equal(history(txs)[0].bills[1].paid, false)
    const result = creditCardBillHistories(txs, [card, other], NOW, new Set(["other:2026-09-06"]))
    assert.equal(result[0].bills[1].paid, false)
    assert.equal(result[1].bills[1].paid, true)
  })

  it("still lists bills for a card with no cycle configured", () => {
    const unconfigured = { ...card, StatementDay: 0, DueDays: 0 }
    const [{ bills }] = history([tx({ BillDate: "2026-09-01" })], NOW, [unconfigured])
    assert.deepEqual(bills.map((b) => [b.dueDate, b.status, b.period]), [["2026-09-01", "past", null]])
  })
})
