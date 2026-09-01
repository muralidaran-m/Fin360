import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "fin360_session"
const SESSION_DURATION = "30d"

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("Missing required environment variable: JWT_SECRET")
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export function verifyPassword(password: string): boolean {
  const appPassword = process.env.APP_PASSWORD
  if (!appPassword) {
    throw new Error("Missing required environment variable: APP_PASSWORD")
  }
  return password === appPassword
}
