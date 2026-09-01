import { connectToSheet } from "@/scripts/lib/connect"
import { SHEET_HEADERS } from "@/lib/types"

async function main() {
  const doc = await connectToSheet()
  console.log(`Connected to spreadsheet: "${doc.title}"`)

  for (const [sheetName, headers] of Object.entries(SHEET_HEADERS)) {
    if (doc.sheetsByTitle[sheetName]) {
      console.log(`- ${sheetName}: already exists, skipping`)
      continue
    }
    await doc.addSheet({ title: sheetName, headerValues: headers })
    console.log(`- ${sheetName}: created`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
