export type CategoryType = "Need" | "Want" | "Income" | "Savings"

export type Category = {
  CategoryID: string
  Name: string
  Type: CategoryType
  Icon: string
  ColorHex: string
}

export type PaymentModeKind = "Ordinary" | "CreditCard"

export type PaymentMode = {
  PaymentModeID: string
  Name: string
  Kind: PaymentModeKind
  StatementDay: number
  DueDays: number
}

export type Event = {
  EventID: string
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
  EventID: string
  EventName: string
  BillDate: string
}

export type Setting = {
  Key: string
  Value: string
}

export const SETTING_KEYS = {
  User1Name: "User1Name",
  User2Name: "User2Name",
} as const

export const DEFAULT_ADDED_BY_NAMES: Record<AddedBy, string> = {
  User1: "User 1",
  User2: "User 2",
}

export type SandboxPlan = {
  PlanID: string
  PlanName: string
  TargetAmount: number
  CurrentSaved: number
  TargetDate: string
  EstimatedMonthlyImpact: number
}

export type PolicyType = "retirement" | "child" | "ulip" | "mf"

export type PremiumFrequency = "annual" | "half-yearly" | "quarterly" | "monthly" | "single"

export type PayoutKind = "survival_benefit" | "maturity" | "annuity" | "child_milestone"

/** Non-PII facts about an insurance policy / fund, as applied from a reviewed plan JSON. */
export type Policy = {
  PolicyID: string
  Nickname: string
  Insurer: string
  PlanName: string
  Type: PolicyType
  PolicyNoLast4: string
  StartDate: string
  PremiumAmount: number | null
  PremiumFrequency: PremiumFrequency
  PremiumPayingTermYrs: number | null
  PolicyTermYrs: number | null
  MaturityDate: string
  VestingDate: string
  SumAssured: number | null
  LockInYrs: number | null
  /** Stored in the sheet as a JSON array string. */
  Riders: string[]
  /** Stored in the sheet as a JSON array string. */
  Benefits: string[]
  Summary: string
  IllustrativeOnly: boolean
  UpdatedAt: string
  /** Market-linked plans only: latest units / NAV entered on /policies (not set by policy:apply). */
  FundUnits?: number | null
  FundNav?: number | null
  FundValueDate?: string
}

export type PolicyPayout = {
  PayoutID: string
  PolicyID: string
  Date: string
  Age: number | null
  Amount: number | null
  Percent: number | null
  Kind: PayoutKind
  Guaranteed: boolean
  Note: string
}

export const SHEET_NAMES = {
  Categories: "Categories",
  PaymentModes: "Payment_Modes",
  Events: "Events",
  Transactions: "Transactions",
  SandboxPlans: "Sandbox_Plans",
  Settings: "Settings",
  Policies: "Policies",
  PolicyPayouts: "Policy_Payouts",
} as const

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES]

export const SHEET_HEADERS: Record<SheetName, string[]> = {
  Categories: ["CategoryID", "Name", "Type", "Icon", "ColorHex"],
  Payment_Modes: ["PaymentModeID", "Name", "Kind", "StatementDay", "DueDays"],
  Events: ["EventID", "Name"],
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
    "EventID",
    "EventName",
    "BillDate",
  ],
  Sandbox_Plans: [
    "PlanID",
    "PlanName",
    "TargetAmount",
    "CurrentSaved",
    "TargetDate",
    "EstimatedMonthlyImpact",
  ],
  Settings: ["Key", "Value"],
  Policies: [
    "PolicyID",
    "Nickname",
    "Insurer",
    "PlanName",
    "Type",
    "PolicyNoLast4",
    "StartDate",
    "PremiumAmount",
    "PremiumFrequency",
    "PremiumPayingTermYrs",
    "PolicyTermYrs",
    "MaturityDate",
    "VestingDate",
    "SumAssured",
    "LockInYrs",
    "Riders",
    "Benefits",
    "Summary",
    "IllustrativeOnly",
    "UpdatedAt",
    "FundUnits",
    "FundNav",
    "FundValueDate",
  ],
  Policy_Payouts: [
    "PayoutID",
    "PolicyID",
    "Date",
    "Age",
    "Amount",
    "Percent",
    "Kind",
    "Guaranteed",
    "Note",
  ],
}
