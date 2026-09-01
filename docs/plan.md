# Product Requirements Document (PRD): Fin360

## 1. Product Overview
**Fin360** is a private, lightweight personal finance application designed for a 2-user household. It focuses on frictionless daily expense tracking, visual financial insights, and a sandbox environment for planning major future purchases. To maximize data ownership and bypass database hosting limits, the application uses **Google Sheets** as its primary backend and database.

## 2. Tech Stack & Architecture
* **Framework:** Next.js 15 (App Router) using React 19.
* **Styling & UI:** Tailwind CSS, `shadcn/ui` (Radix UI primitives), Lucide React (icons).
* **Charts:** Recharts or Chart.js for dashboard analytics.
* **Forms & Validation:** React Hook Form + Zod.
* **Backend/Database:** Google Sheets API (via `google-spreadsheet` npm package).
* **Authentication:** A single shared password or simple JWT login (since it is strictly for 2 internal users). Google API auth is handled server-side via a Google Cloud Service Account.
* **Caching:** Next.js Data Cache / `unstable_cache` to minimize Google Sheets API read calls and prevent rate limiting. Writes will invalidate the cache.

## 3. Data Schema (Google Sheets Structure)
The AI agent must initialize interactions with a Google Workbook containing the following exactly named tabs (sheets) and headers (Row 1).

### Tab 1: `Categories`
* **Columns:** `CategoryID` (UUID), `Name` (String), `Type` (Enum: `Need`, `Want`, `Income`, `Savings`), `Icon` (String/Lucide icon name), `ColorHex` (String).
* **Purpose:** Drives dropdowns and analytics grouping. Users can dynamically add to this via the UI.

### Tab 2: `Transactions`
* **Columns:** `TxID` (UUID), `Date` (ISO Date), `Amount` (Number), `Type` (Enum: `Expense`, `Income`), `CategoryID` (UUID), `CategoryName` (String), `AddedBy` (String: "User1" | "User2"), `Note` (String), `IsRecurring` (Boolean).
* **Purpose:** Core ledger. Includes `CategoryName` directly to avoid complex join logic on the frontend, and an `IsRecurring` flag to track manual prepayments and fixed monthly costs.

### Tab 3: `Sandbox_Plans`
* **Columns:** `PlanID` (UUID), `PlanName` (String), `TargetAmount` (Number), `CurrentSaved` (Number), `TargetDate` (ISO Date), `EstimatedMonthlyImpact` (Number).
* **Purpose:** High-level data for the major expense workspace.

## 4. Core Features & Functional Requirements

### Feature 1: Frictionless Daily Tracking (Quick-Add)
* **UI/UX:** A mobile-first form accessible from anywhere in the app. 
* **Fields:** Amount (auto-focused numeric pad on mobile), Category (searchable dropdown/chips), Date (defaults to today), Note (optional), `IsRecurring` (Checkbox/Toggle), Added By (toggle between User A / User B, persisted in local storage).
* **Action:** Submitting the form triggers a server action to append a row to the `Transactions` sheet and revalidates the cache.

### Feature 2: Dynamic Category Management
* **Requirement:** Users must not be locked into hardcoded categories.
* **Action:** Within the Quick-Add form or a Settings page, users can click "Add New Category", define its `Type` (Need/Want/Income) and submit. This appends a row to the `Categories` sheet, immediately making it available for new transactions.

### Feature 3: Analytics Dashboards
* **Timeframes:** Current Month (default), Last Month, Year-to-Date.
* **Key Visualizations:**
  1. **Total Recurring Expense:** A prominent metric card calculating the sum of all transactions marked as `IsRecurring = TRUE` for the current month.
  2. **50/30/20 Breakdown:** A donut chart aggregating current month expenses by Category `Type` (Needs vs Wants vs Savings).
  3. **Burn Rate & Runway:** A line chart showing daily cumulative spend against a calculated monthly baseline.
  4. **Category Drift:** A bar chart highlighting categories where spending is $\pm 15\%$ higher/lower than the 3-month trailing average.
  5. **Household Split:** A simple visual showing spending breakdown by `AddedBy`.

### Feature 4: The Sandbox (Major Expense Planner)
* **Requirement:** A workspace to simulate buying a car, house, or planning a vacation without polluting actual financial data.
* **Mechanics:** 
  * User creates a "Plan" (e.g., "Car 2027").
  * User inputs the `TargetAmount` and `TargetDate`.
  * The app calculates the required monthly savings (Sinking Fund requirement): `(TargetAmount - CurrentSaved) / Months Until TargetDate`.
  * The UI projects how adding this new monthly burden impacts the user's *current* average monthly surplus (Income minus Average Expenses).

## 5. API & Environment Variables Needed
To instruct the AI correctly, ensure it creates a `.env.local` file utilizing these keys:
* `GOOGLE_SERVICE_ACCOUNT_EMAIL` (For the bot to access the sheet)
* `GOOGLE_PRIVATE_KEY` (Needs to handle `\n` character parsing correctly in Next.js)
* `GOOGLE_SHEET_ID` (The string from the sheet's URL)

## 6. Development Phasing (Instructions for AI)
1. **Phase 1: Foundation.** Scaffold Next.js app, configure Tailwind/shadcn, and build the Google Sheets connector utility (read/write functions).
2. **Phase 2: Data Entry.** Build the `Categories` sync and the Quick-Add `Transactions` form, ensuring the new `IsRecurring` toggle is included and writes to the sheet correctly.
3. **Phase 3: Visualization.** Fetch transaction history and build the Recharts dashboard, prioritizing the new Total Recurring Expense metric.
4. **Phase 4: Sandbox.** Build the planning workspace UI and calculations.