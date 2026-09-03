"use client"

import { useActionState } from "react"

import { login, type LoginState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <div className="bg-sidebar flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size local asset, no optimization needed */}
          <img
            src="/logo.png"
            alt="NammaLedger"
            width={88}
            height={88}
            className="rounded-2xl"
          />
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">Namma</span>Ledger
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with your household PassKey
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="passkey">PassKey</Label>
              <Input
                id="passkey"
                name="password"
                type="password"
                autoFocus
                required
              />
            </div>
            {state.error ? (
              <p className="text-destructive text-sm">{state.error}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
