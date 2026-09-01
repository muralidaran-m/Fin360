# Fin360

Private household finance tracker backed by Google Sheets. See [docs/plan.md](docs/plan.md) for the full product spec.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` — from a Google Cloud service account shared on the target spreadsheet
   - `APP_PASSWORD` — the shared household login password
   - `JWT_SECRET` — random string for signing session cookies (`openssl rand -base64 32`)
3. Create the required sheet tabs/headers (`Categories`, `Transactions`, `Sandbox_Plans`) if they don't exist yet:
   ```bash
   npm run init-sheets
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS · shadcn/ui · react-hook-form + zod · Google Sheets API via `google-spreadsheet`.

Auth is a single shared password gated by `proxy.ts` (Next's middleware convention), issuing a signed JWT session cookie.
