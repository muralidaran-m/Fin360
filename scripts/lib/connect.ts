import { config } from "dotenv"

config({ path: ".env.local" })

import { JWT } from "google-auth-library"
import { GoogleSpreadsheet } from "google-spreadsheet"

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export async function connectToSheet(): Promise<GoogleSpreadsheet> {
  const auth = new JWT({
    email: getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const doc = new GoogleSpreadsheet(getEnv("GOOGLE_SHEET_ID"), auth)
  await doc.loadInfo()
  return doc
}
