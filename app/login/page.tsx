"use client"

import { useActionState } from "react"

import { login, type LoginState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Fin360</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Household password</Label>
              <Input
                id="password"
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
