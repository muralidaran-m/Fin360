import { createInterface } from "node:readline/promises"

import { connectToSheet } from "@/scripts/lib/connect"
import { SHEET_HEADERS } from "@/lib/types"

async function confirm(message: string): Promise<boolean> {
  if (process.argv.includes("--yes")) {
    return true
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${message} Type "yes" to continue: `)
  rl.close()
  return answer.trim().toLowerCase() === "yes"
}

async function main() {
  const doc = await connectToSheet()
  console.log(`Connected to spreadsheet: "${doc.title}"`)

  const sheetNames = Object.keys(SHEET_HEADERS)
  const counts: Record<string, number> = {}

  for (const sheetName of sheetNames) {
    const sheet = doc.sheetsByTitle[sheetName]
    if (!sheet) {
      counts[sheetName] = 0
      continue
    }
    const rows = await sheet.getRows()
    counts[sheetName] = rows.length
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  if (total === 0) {
    console.log("No data rows found — nothing to clean up.")
    return
  }

  console.log("\nThis will permanently delete all data rows (headers kept):")
  for (const sheetName of sheetNames) {
    console.log(`- ${sheetName}: ${counts[sheetName]} row(s)`)
  }

  const ok = await confirm("\nThis cannot be undone.")
  if (!ok) {
    console.log("Aborted. No changes made.")
    return
  }

  for (const sheetName of sheetNames) {
    const sheet = doc.sheetsByTitle[sheetName]
    if (!sheet || counts[sheetName] === 0) {
      continue
    }
    await sheet.clearRows()
    console.log(`- ${sheetName}: cleared`)
  }

  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
