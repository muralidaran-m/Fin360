import { config } from "dotenv"

config({ path: ".env.local" })

import { ensureSheetsExist } from "@/lib/sheets"

async function main() {
  await ensureSheetsExist()
  console.log("Sheet tabs verified/created: Categories, Transactions, Sandbox_Plans")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
