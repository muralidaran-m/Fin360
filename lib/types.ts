export type CategoryType = "Need" | "Want" | "Income" | "Savings"

export type Category = {
  CategoryID: string
  Name: string
  Type: CategoryType
  Icon: string
  ColorHex: string
}

export type TransactionType = "Expense" | "Income"

export type AddedBy = "User1" | "User2"

export type Transaction = {
  TxID: string
  Date: string
  Amount: number
  Type: TransactionType
  CategoryID: string
  CategoryName: string
  AddedBy: AddedBy
  Note: string
  IsRecurring: boolean
}

export type SandboxPlan = {
  PlanID: string
  PlanName: string
  TargetAmount: number
  CurrentSaved: number
  TargetDate: string
  EstimatedMonthlyImpact: number
}

export const SHEET_NAMES = {
  Categories: "Categories",
  Transactions: "Transactions",
  SandboxPlans: "Sandbox_Plans",
} as const

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES]

export const SHEET_HEADERS: Record<SheetName, string[]> = {
  Categories: ["CategoryID", "Name", "Type", "Icon", "ColorHex"],
  Transactions: [
    "TxID",
    "Date",
    "Amount",
    "Type",
    "CategoryID",
    "CategoryName",
    "AddedBy",
    "Note",
    "IsRecurring",
  ],
  Sandbox_Plans: [
    "PlanID",
    "PlanName",
    "TargetAmount",
    "CurrentSaved",
    "TargetDate",
    "EstimatedMonthlyImpact",
  ],
}
