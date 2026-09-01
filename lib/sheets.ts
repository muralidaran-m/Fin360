import "server-only"

import { JWT } from "google-auth-library"
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet"

import { SHEET_HEADERS, type SheetName } from "@/lib/types"

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getAuthClient() {
  return new JWT({
    email: getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: SCOPES,
  })
}

let docPromise: Promise<GoogleSpreadsheet> | null = null

async function loadDoc(): Promise<GoogleSpreadsheet> {
  const doc = new GoogleSpreadsheet(getEnv("GOOGLE_SHEET_ID"), getAuthClient())
  await doc.loadInfo()
  return doc
}

/** Cached, lazily-initialized handle to the workbook for this server process. */
function getDoc(): Promise<GoogleSpreadsheet> {
  if (!docPromise) {
    docPromise = loadDoc().catch((err) => {
      docPromise = null
      throw err
    })
  }
  return docPromise
}

async function getSheet(sheetName: SheetName) {
  const doc = await getDoc()
  const sheet = doc.sheetsByTitle[sheetName]
  if (!sheet) {
    throw new Error(
      `Sheet tab "${sheetName}" not found in workbook. Run "npm run init-sheets" first.`
    )
  }
  return sheet
}

function rowToObject<T extends Record<string, unknown>>(
  row: GoogleSpreadsheetRow,
  headers: string[]
): T {
  const obj = {} as Record<string, unknown>
  for (const header of headers) {
    obj[header] = row.get(header)
  }
  return obj as T
}

export async function getRows<T extends Record<string, unknown>>(
  sheetName: SheetName
): Promise<T[]> {
  const sheet = await getSheet(sheetName)
  const rows = await sheet.getRows()
  const headers = SHEET_HEADERS[sheetName]
  return rows.map((row) => rowToObject<T>(row, headers))
}

type CellValue = string | number | boolean

export async function appendRow(
  sheetName: SheetName,
  data: Record<string, CellValue>
): Promise<void> {
  const sheet = await getSheet(sheetName)
  await sheet.addRow(data)
}

export async function updateRow(
  sheetName: SheetName,
  idField: string,
  idValue: string,
  data: Record<string, CellValue>
): Promise<void> {
  const sheet = await getSheet(sheetName)
  const rows = await sheet.getRows()
  const row = rows.find((r) => r.get(idField) === idValue)
  if (!row) {
    throw new Error(`Row with ${idField}=${idValue} not found in ${sheetName}`)
  }
  for (const [key, value] of Object.entries(data)) {
    row.set(key, value)
  }
  await row.save()
}

/** Creates any missing sheet tabs with their header row. Idempotent. */
export async function ensureSheetsExist(): Promise<void> {
  const doc = await getDoc()
  for (const [sheetName, headers] of Object.entries(SHEET_HEADERS)) {
    const existing = doc.sheetsByTitle[sheetName]
    if (existing) {
      continue
    }
    await doc.addSheet({ title: sheetName, headerValues: headers })
  }
}
