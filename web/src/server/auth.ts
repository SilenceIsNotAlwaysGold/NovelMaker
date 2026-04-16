import { db } from './db'

const ALGORITHM = 'HS256'
const TOKEN_COOKIE = 'novel_token'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

function getSecret(): ArrayBuffer {
  const secret = process.env.JWT_SECRET ?? 'novelmaker-dev-secret-change-in-production'
  return new TextEncoder().encode(secret).buffer as ArrayBuffer
}

// Minimal JWT implementation using Web Crypto (no external deps)
async function signJWT(payload: { userId: string }): Promise<string> {
  const header = { alg: ALGORITHM, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + TOKEN_MAX_AGE }

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const headerB64 = encode(header)
  const bodyB64 = encode(body)
  const data = `${headerB64}.${bodyB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    getSecret(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${data}.${sigB64}`
}

async function verifyJWT(token: string): Promise<{ userId: string } | null> {
  try {
    const [headerB64, bodyB64, sigB64] = token.split('.')
    if (!headerB64 || !bodyB64 || !sigB64) return null

    const data = `${headerB64}.${bodyB64}`
    const key = await crypto.subtle.importKey(
      'raw',
      getSecret(),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Restore base64 padding
    const sig = atob(sigB64.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (sigB64.length % 4)) % 4))
    const sigBytes = Uint8Array.from(sig, (c) => c.charCodeAt(0))

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
    if (!valid) return null

    const body = JSON.parse(
      atob(bodyB64.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (bodyB64.length % 4)) % 4)),
    )

    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null

    return { userId: body.userId }
  } catch {
    return null
  }
}

/** Extract userId from request cookie */
export async function getUserFromRequest(req: Request): Promise<{ id: string; email: string; name: string } | null> {
  const cookie = req.headers.get('cookie')
  if (!cookie) return null

  const match = cookie.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`))
  if (!match) return null

  const payload = await verifyJWT(match[1])
  if (!payload) return null

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true },
  })

  return user
}

/** Create Set-Cookie header value for login */
export async function createAuthCookie(userId: string): Promise<string> {
  const token = await signJWT({ userId })
  return `${TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_MAX_AGE}`
}

/** Create Set-Cookie header value for logout (expires immediately) */
export function createLogoutCookie(): string {
  return `${TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}
