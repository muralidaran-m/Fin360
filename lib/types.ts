export type CategoryType = "Need" | "Want" | "Income" | "Savings"

export type Category = {
  CategoryID: string
  Name: string
  Type: CategoryType
  Icon: string
  ColorHex: string
}

export type PaymentMode = {
  PaymentModeID: string
  Name: string
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
  PaymentModeID: string
  PaymentModeName: string
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
  PaymentModes: "Payment_Modes",
  Transactions: "Transactions",
  SandboxPlans: "Sandbox_Plans",
} as const

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES]

export const SHEET_HEADERS: Record<SheetName, string[]> = {
  Categories: ["CategoryID", "Name", "Type", "Icon", "ColorHex"],
  Payment_Modes: ["PaymentModeID", "Name"],
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
    "PaymentModeID",
    "PaymentModeName",
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
