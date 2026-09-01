import { config } from "dotenv"

config({ path: ".env.local" })

import { JWT } from "google-auth-library"
import { GoogleSpreadsheet } from "google-spreadsheet"

import { SHEET_HEADERS } from "@/lib/types"

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function main() {
  const auth = new JWT({
    email: getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const doc = new GoogleSpreadsheet(getEnv("GOOGLE_SHEET_ID"), auth)
  await doc.loadInfo()
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
