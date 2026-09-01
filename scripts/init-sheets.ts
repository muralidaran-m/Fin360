import { connectToSheet } from "@/scripts/lib/connect"
import { SHEET_HEADERS } from "@/lib/types"

async function main() {
  const doc = await connectToSheet()
  console.log(`Connected to spreadsheet: "${doc.title}"`)

  for (const [sheetName, headers] of Object.entries(SHEET_HEADERS)) {
    const sheet = doc.sheetsByTitle[sheetName]

    if (!sheet) {
      await doc.addSheet({ title: sheetName, headerValues: headers })
      console.log(`- ${sheetName}: created`)
      continue
    }

    await sheet.loadHeaderRow()
    const missing = headers.filter((h) => !sheet.headerValues.includes(h))
    if (missing.length === 0) {
      console.log(`- ${sheetName}: already up to date`)
      continue
    }

    await sheet.setHeaderRow([...sheet.headerValues, ...missing])
    console.log(`- ${sheetName}: added column(s) ${missing.join(", ")}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
