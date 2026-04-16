import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/server/db'
import { createAuthCookie, createLogoutCookie, getUserFromRequest } from '@/server/auth'

/** POST /api/auth — login or register based on `action` field */
export async function POST(req: Request) {
  const body = await req.json()
  const { action } = body

  if (action === 'register') {
    return handleRegister(body)
  }
  if (action === 'login') {
    return handleLogin(body)
  }
  if (action === 'logout') {
    return handleLogout()
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}

/** GET /api/auth — get current user */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({ user })
}

async function handleRegister(body: { email?: string; password?: string; name?: string }) {
  const { email, password, name } = body

  if (!email || !password) {
    return NextResponse.json({ error: '请填写邮箱和密码' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少需要 6 个字符' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: { email, passwordHash, name: name ?? '' },
  })

  const cookie = await createAuthCookie(user.id)
  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } })
  res.headers.set('Set-Cookie', cookie)
  return res
}

async function handleLogin(body: { email?: string; password?: string }) {
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: '请填写邮箱和密码' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 })
  }

  const cookie = await createAuthCookie(user.id)
  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } })
  res.headers.set('Set-Cookie', cookie)
  return res
}

async function handleLogout() {
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', createLogoutCookie())
  return res
}
