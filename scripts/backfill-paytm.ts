import { readFile, writeFile } from "node:fs/promises"

import { v4 as uuid } from "uuid"

import { connectToSheet } from "@/scripts/lib/connect"
import { parseCsv } from "@/scripts/lib/csv"
import { CATEGORY_ICON_NAMES } from "@/lib/icons"
import { SHEET_NAMES, type Category, type CategoryType } from "@/lib/types"

const PAYMENT_MODE_NAME = "UPI (PayTm)"
const RANGE_START = "2026-03-01"
const RANGE_END = "2026-08-31"
const DEFAULT_PLAN_PATH = "data/paytm-backfill-plan.json"

type PlanCategory = {
  tag: string
  matchedCategoryId: string | null
  matchedCategoryName: string | null
  proposed: { Name: string; Type: CategoryType; Icon: string; ColorHex: string } | null
  skip: boolean
  txCount: number
  totalAmount: number
}

type PlanTransaction = {
  date: string
  amount: number
  tag: string
  note: string
  skip: boolean
}

type Plan = {
  paymentModeId: string
  paymentModeName: string
  categories: PlanCategory[]
  transactions: PlanTransaction[]
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {}
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue
    const body = arg.slice(2)
    const eq = body.indexOf("=")
    if (eq === -1) {
      args[body] = true
    } else {
      args[body.slice(0, eq)] = body.slice(eq + 1)
    }
  }
  return args
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** "17/09/2026" -> "2026-09-17" */
function toIsoDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split("/")
  return `${y}-${pad(Number(m))}-${pad(Number(d))}`
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""))
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

/** Strip the leading "#" and emoji glyphs Paytm prefixes its tags with, e.g. "#🥘 Food" -> "Food". */
function cleanTag(rawTag: string): string {
  return rawTag
    .replace(/^#/, "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{2000}-\u{206F}]/gu, "")
    .trim()
}

function findMatch(cleanedTag: string, categories: Category[]): Category | null {
  const normTag = normalize(cleanedTag)

  const exact = categories.find((c) => normalize(c.Name) === normTag)
  if (exact) return exact

  const substring = categories.find((c) => {
    const normName = normalize(c.Name)
    return normName.includes(normTag) || normTag.includes(normName)
  })
  if (substring) return substring

  let best: { category: Category; distance: number } | null = null
  for (const c of categories) {
    const distance = levenshtein(normTag, normalize(c.Name))
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { category: c, distance }
    }
  }
  return best?.category ?? null
}

const DEFAULT_TYPE_BY_TAG: Record<string, CategoryType> = {
  "money received": "Income",
  groceries: "Need",
  "bill payments": "Need",
  fuel: "Need",
  "financial services": "Need",
  insurance: "Need",
  medical: "Need",
  education: "Need",
}

const DEFAULT_ICON_BY_TAG: Record<string, string> = {
  food: "Utensils",
  groceries: "ShoppingCart",
  shopping: "ShoppingBag",
  "financial services": "Landmark",
  miscellaneous: "MoreHorizontal",
  entertainment: "Clapperboard",
  "bill payments": "Receipt",
  fuel: "Fuel",
  services: "Wrench",
  "money received": "Wallet",
  "money transfer": "Wallet",
  insurance: "HandHeart",
  travel: "Plane",
  taxi: "Car",
  medical: "HeartPulse",
  education: "GraduationCap",
}

const COLOR_PALETTE = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#ec4899",
  "#6366f1",
  "#84cc16",
]

function proposeCategory(cleanedTag: string, index: number): PlanCategory["proposed"] {
  const key = normalize(cleanedTag)
  return {
    Name: cleanedTag,
    Type: DEFAULT_TYPE_BY_TAG[key] ?? "Want",
    Icon: DEFAULT_ICON_BY_TAG[key] ?? "MoreHorizontal",
    ColorHex: COLOR_PALETTE[index % COLOR_PALETTE.length],
  }
}

const GENERIC_REMARKS = new Set(["", "pay", "payment"])

function buildNote(row: Record<string, string>): string {
  const parts = [row["Transaction Details"], row["Other Transaction Details (UPI ID or A/c No)"]]

  const remark = row["Remarks"]?.trim() ?? ""
  if (remark && !GENERIC_REMARKS.has(remark.toLowerCase())) {
    parts.push(remark)
  }

  const ref = row["UPI Ref No."]?.trim()
  if (ref) parts.push(`Ref:${ref}`)

  return parts.filter(Boolean).join(" · ").slice(0, 200)
}

async function loadInRangeRows(filePath: string): Promise<Record<string, string>[]> {
  const csvText = await readFile(filePath, "utf-8")
  const allRows = parseCsv(csvText)
  const rows = allRows.filter((r) => {
    const iso = toIsoDate(r["Date"])
    return iso >= RANGE_START && iso <= RANGE_END
  })
  console.log(`Parsed ${allRows.length} rows, ${rows.length} within ${RANGE_START}..${RANGE_END}`)
  return rows
}

async function runPlan(args: Record<string, string | boolean>): Promise<void> {
  const filePath = typeof args.file === "string" ? args.file : "data/paytm_mar2sep.csv"
  const outPath = typeof args.out === "string" ? args.out : DEFAULT_PLAN_PATH

  const rows = await loadInRangeRows(filePath)

  const doc = await connectToSheet()
  const categoriesSheet = doc.sheetsByTitle[SHEET_NAMES.Categories]
  const paymentModesSheet = doc.sheetsByTitle[SHEET_NAMES.PaymentModes]
  if (!categoriesSheet || !paymentModesSheet) {
    throw new Error("Categories/Payment_Modes sheet not found — run `npm run init-sheets` first.")
  }

  const categoryRows = await categoriesSheet.getRows()
  const categories: Category[] = categoryRows.map((r) => ({
    CategoryID: r.get("CategoryID"),
    Name: r.get("Name"),
    Type: r.get("Type"),
    Icon: r.get("Icon"),
    ColorHex: r.get("ColorHex"),
  }))

  const paymentModeRows = await paymentModesSheet.getRows()
  const paymentModeRow = paymentModeRows.find(
    (r) => normalize(r.get("Name")) === normalize(PAYMENT_MODE_NAME)
  )
  if (!paymentModeRow) {
    throw new Error(
      `Payment mode "${PAYMENT_MODE_NAME}" not found in Payment_Modes sheet. Create it in the app first.`
    )
  }

  const byTag = new Map<string, { count: number; totalAmount: number }>()
  for (const row of rows) {
    const tag = row["Tags"]?.trim()
    if (!tag) continue
    const entry = byTag.get(tag) ?? { count: 0, totalAmount: 0 }
    entry.count += 1
    entry.totalAmount += Math.abs(parseAmount(row["Amount"]))
    byTag.set(tag, entry)
  }

  const planCategories: PlanCategory[] = [...byTag.entries()].map(([tag, stats], index) => {
    const cleaned = cleanTag(tag)
    const matched = findMatch(cleaned, categories)
    return {
      tag,
      matchedCategoryId: matched?.CategoryID ?? null,
      matchedCategoryName: matched?.Name ?? null,
      proposed: matched ? null : proposeCategory(cleaned, index),
      skip: false,
      txCount: stats.count,
      totalAmount: Math.round(stats.totalAmount * 100) / 100,
    }
  })

  const planTransactions: PlanTransaction[] = rows.map((row) => ({
    date: toIsoDate(row["Date"]),
    amount: Math.abs(parseAmount(row["Amount"])),
    tag: row["Tags"].trim(),
    note: buildNote(row),
    skip: false,
  }))

  const plan: Plan = {
    paymentModeId: paymentModeRow.get("PaymentModeID"),
    paymentModeName: paymentModeRow.get("Name"),
    categories: planCategories,
    transactions: planTransactions,
  }

  await writeFile(outPath, JSON.stringify(plan, null, 2))

  const matchedCount = planCategories.filter((c) => c.matchedCategoryId).length
  console.log(
    `Categories: ${planCategories.length} tag(s) -> ${matchedCount} matched, ${planCategories.length - matchedCount} proposed new`
  )
  console.log(`Payment mode: "${plan.paymentModeName}" (${plan.paymentModeId})`)
  console.log(`Wrote plan to ${outPath}.`)
  console.log(`Review/edit it, then run: npm run backfill:paytm -- --apply --plan=${outPath}`)
}

async function runApply(args: Record<string, string | boolean>): Promise<void> {
  const planPath = typeof args.plan === "string" ? args.plan : DEFAULT_PLAN_PATH
  const addedBy = typeof args["added-by"] === "string" ? args["added-by"] : "User1"
  if (addedBy !== "User1" && addedBy !== "User2") {
    throw new Error(`--added-by must be "User1" or "User2", got "${addedBy}"`)
  }

  const plan: Plan = JSON.parse(await readFile(planPath, "utf-8"))

  const doc = await connectToSheet()
  const categoriesSheet = doc.sheetsByTitle[SHEET_NAMES.Categories]
  const transactionsSheet = doc.sheetsByTitle[SHEET_NAMES.Transactions]
  if (!categoriesSheet || !transactionsSheet) {
    throw new Error("Categories/Transactions sheet not found — run `npm run init-sheets` first.")
  }

  const categoryRows = await categoriesSheet.getRows()
  const categoriesByName = new Map(categoryRows.map((r) => [normalize(r.get("Name")), r]))
  const categoriesById = new Map(categoryRows.map((r) => [r.get("CategoryID"), r]))

  const tagToCategory = new Map<string, { CategoryID: string; Name: string; Type: CategoryType }>()
  let createdCategories = 0

  for (const entry of plan.categories) {
    if (entry.skip) continue

    if (entry.matchedCategoryId) {
      const row = categoriesById.get(entry.matchedCategoryId)
      if (!row) {
        throw new Error(`Matched category ${entry.matchedCategoryId} for tag "${entry.tag}" no longer exists`)
      }
      tagToCategory.set(entry.tag, {
        CategoryID: row.get("CategoryID"),
        Name: row.get("Name"),
        Type: row.get("Type"),
      })
      continue
    }

    if (!entry.proposed) continue

    const existingByName = categoriesByName.get(normalize(entry.proposed.Name))
    if (existingByName) {
      tagToCategory.set(entry.tag, {
        CategoryID: existingByName.get("CategoryID"),
        Name: existingByName.get("Name"),
        Type: existingByName.get("Type"),
      })
      continue
    }

    if (!CATEGORY_ICON_NAMES.includes(entry.proposed.Icon)) {
      throw new Error(
        `Icon "${entry.proposed.Icon}" for new category "${entry.proposed.Name}" is not a valid icon name`
      )
    }

    const categoryId = uuid()
    await categoriesSheet.addRow({
      CategoryID: categoryId,
      Name: entry.proposed.Name,
      Type: entry.proposed.Type,
      Icon: entry.proposed.Icon,
      ColorHex: entry.proposed.ColorHex,
    })
    createdCategories += 1
    tagToCategory.set(entry.tag, {
      CategoryID: categoryId,
      Name: entry.proposed.Name,
      Type: entry.proposed.Type,
    })
  }

  const rowsToInsert: Record<string, string | number | boolean>[] = []
  let skipped = 0

  for (const tx of plan.transactions) {
    if (tx.skip) {
      skipped += 1
      continue
    }
    const category = tagToCategory.get(tx.tag)
    if (!category) {
      console.warn(`No category resolved for tag "${tx.tag}" (${tx.date}, ${tx.amount}) — skipping`)
      skipped += 1
      continue
    }
    rowsToInsert.push({
      TxID: uuid(),
      Date: tx.date,
      Amount: tx.amount,
      Type: category.Type === "Income" ? "Income" : "Expense",
      CategoryID: category.CategoryID,
      CategoryName: category.Name,
      AddedBy: addedBy,
      Note: tx.note,
      IsRecurring: false,
      PaymentModeID: plan.paymentModeId,
      PaymentModeName: plan.paymentModeName,
      EventID: "",
      EventName: "",
      BillDate: "",
    })
  }

  if (rowsToInsert.length > 0) {
    await transactionsSheet.addRows(rowsToInsert)
  }

  console.log(`Categories created: ${createdCategories}`)
  console.log(`Transactions inserted: ${rowsToInsert.length}`)
  console.log(`Transactions skipped: ${skipped}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.apply) {
    await runApply(args)
  } else {
    await runPlan(args)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
