# 技术方案：NextAuth v5 集成 GitHub OAuth

## 1. 背景与目标

### 背景
NovelMaker 当前使用自定义 JWT 认证系统（bcrypt + Web Crypto API），支持邮箱+密码登录注册。认证流程：
- 前端 Zustand store (`auth-store.ts`) 调用 `POST /api/auth`
- 后端手动签发 JWT，存入 HttpOnly cookie `novel_token`
- tRPC context 通过 `getUserFromRequest()` 解析 cookie 获取用户
- `AuthGuard` 组件做客户端路由保护

### 目标
用 NextAuth v5 (Auth.js) **统一接管所有认证**，在保留邮箱+密码登录的基础上，增加 GitHub OAuth 作为第二种登录方式。相同邮箱的账号自动合并。

## 2. 功能范围

| 功能 | 说明 |
|------|------|
| GitHub OAuth 登录 | 一键跳转 GitHub 授权，回调后自动登录/注册 |
| 邮箱密码登录 | 保留现有功能，迁移到 NextAuth Credentials Provider |
| 邮箱密码注册 | 保留注册功能，通过独立 API route 实现（NextAuth 不处理注册） |
| 账号自动合并 | GitHub 邮箱与已有用户邮箱匹配时，关联到同一 User 记录 |
| Session 管理 | 统一使用 NextAuth JWT 策略 |
| 路由保护 | NextAuth middleware 替代现有 AuthGuard 客户端检查 |

### 不在范围内
- 用户头像/GitHub profile 同步
- 多 OAuth 提供商（仅 GitHub）
- 角色/权限管理
- 密码重置功能

## 3. 技术方案

### 3.1 整体架构变更

```
变更前:
  Login Page → POST /api/auth → 自定义 JWT → cookie → getUserFromRequest() → tRPC context

变更后:
  Login Page → NextAuth signIn() → NextAuth JWT → session → auth() → tRPC context
                ├── Credentials Provider (邮箱+密码)
                └── GitHub Provider (OAuth)
```

### 3.2 数据库变更

#### 新增 Account 表

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth" | "credentials"
  provider          String  // "github" | "credentials"
  providerAccountId String  // GitHub user ID 或 email
  access_token      String?
  token_type        String?
  scope             String?
  createdAt         DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

#### User 表修改

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @default("")  // 允许空（GitHub 用户无密码）
  name         String   @default("")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  novels   Novel[]
  accounts Account[]  // 新增关联
}
```

**变更说明**：`passwordHash` 从必填改为默认空字符串，因为通过 GitHub OAuth 注册的用户不需要密码。

#### 迁移策略
- 创建新 migration：`add_account_table`
- 修改 User.passwordHash 默认值
- 现有用户数据无需迁移（passwordHash 已有值不受影响）

### 3.3 NextAuth 配置

#### 新增文件：`web/src/server/auth-config.ts`

```typescript
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"  // 仅参考，实际用自定义逻辑
import bcrypt from "bcryptjs"
import { db } from "./db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.passwordHash) return null
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "github") {
        // 账号合并逻辑：按邮箱查找已有用户
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        })
        if (existingUser) {
          // 已有用户 → 关联 GitHub Account
          await db.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "github",
                providerAccountId: account.providerAccountId,
              },
            },
            update: { access_token: account.access_token },
            create: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              token_type: account.token_type,
              scope: account.scope,
            },
          })
          // 覆盖 user.id 为已有用户 ID，确保 JWT 中是正确的 ID
          user.id = existingUser.id
        } else {
          // 新用户 → 创建 User + Account
          const newUser = await db.user.create({
            data: {
              email: user.email!,
              name: user.name ?? "",
              passwordHash: "", // GitHub 用户无密码
            },
          })
          await db.account.create({
            data: {
              userId: newUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              token_type: account.token_type,
              scope: account.scope,
            },
          })
          user.id = newUser.id
        }
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
      }
      return token
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },

  pages: {
    signIn: "/login",  // 复用现有登录页
  },
})
```

**关键设计决策**：
- **不使用 PrismaAdapter**：NextAuth 的 Prisma Adapter 会自动创建/管理 User 和 Account，但我们需要自定义账号合并逻辑，且 User 模型有额外字段（passwordHash）。因此在 `signIn` callback 中手动处理。
- **JWT 策略**：不用数据库 session，与现有架构一致，且 SQLite 不适合频繁的 session 读写。
- **Credentials Provider**：接管现有邮箱密码登录，`authorize()` 函数复用现有的 bcrypt 验证逻辑。

### 3.4 API Route 变更

#### 替换：`web/src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/server/auth-config"
export const { GET, POST } = handlers
```

删除原有 `web/src/app/api/auth/route.ts`。

#### 保留注册 API：`web/src/app/api/register/route.ts`

NextAuth 不处理用户注册，需要独立的注册接口：

```typescript
import bcrypt from "bcryptjs"
import { db } from "@/server/db"

export async function POST(req: Request) {
  const { email, password, name } = await req.json()

  // 验证
  if (!email || !password || password.length < 6) {
    return Response.json({ error: "邮箱和密码（至少6位）必填" }, { status: 400 })
  }

  // 检查邮箱是否已注册
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: "该邮箱已注册" }, { status: 400 })
  }

  // 创建用户
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: { email, passwordHash, name: name || "" },
  })

  return Response.json({ id: user.id, email: user.email, name: user.name })
}
```

### 3.5 tRPC Context 改造

#### 修改：`web/src/server/trpc.ts`

```typescript
import { auth } from "./auth-config"

export const createTRPCContext = async (opts?: { req?: Request }) => {
  // 使用 NextAuth 的 auth() 获取 session
  const session = await auth()
  const user = session?.user
    ? { id: session.user.id!, email: session.user.email!, name: session.user.name ?? "" }
    : null

  return { db, user }
}
```

删除对旧 `getUserFromRequest` 的依赖。

### 3.6 前端改造

#### 修改：`web/src/lib/auth-store.ts`

使用 NextAuth 的 `signIn`/`signOut` 函数替换手动 fetch：

```typescript
import { create } from "zustand"
import { signIn, signOut, useSession } from "next-auth/react"

// 注册仍需手动调用
async function registerUser(email: string, password: string, name: string) {
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error)
  }
  // 注册成功后自动登录
  await signIn("credentials", { email, password, redirect: false })
}
```

**注意**：NextAuth v5 推荐使用 `useSession()` hook 获取用户状态，而非 Zustand store。评估是否可以简化为直接使用 `useSession()`，减少一层抽象。

#### 修改：`web/src/app/layout.tsx`

添加 `SessionProvider`：

```typescript
import { SessionProvider } from "next-auth/react"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          <ThemeProvider>
            <TRPCProvider>
              {/* AuthGuard 改用 useSession 或 middleware 替代 */}
              <AppShell>{children}</AppShell>
            </TRPCProvider>
          </ThemeProvider>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
```

#### 修改：`web/src/components/layout/auth-guard.tsx`

改用 `useSession()` 替代手动 fetch：

```typescript
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

export function AuthGuard({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  if (status === "loading") return <LoadingScreen />
  if (!session && pathname !== "/login") {
    router.replace("/login")
    return null
  }
  if (session && pathname === "/login") {
    router.replace("/")
    return null
  }
  return children
}
```

#### 修改：`web/src/app/login/page.tsx`

增加 GitHub 登录按钮：

```tsx
import { signIn } from "next-auth/react"

// 在现有表单下方添加
<div className="mt-4">
  <div className="relative my-4">
    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-background px-2 text-muted-foreground">或</span>
    </div>
  </div>
  <Button
    variant="outline"
    className="w-full"
    onClick={() => signIn("github", { callbackUrl: "/" })}
  >
    <GitHubIcon className="mr-2 h-4 w-4" />
    使用 GitHub 登录
  </Button>
</div>
```

邮箱密码登录表单改用 `signIn("credentials", { ... })`。

#### 修改：`web/src/components/layout/header.tsx`

登出按钮改用 NextAuth 的 `signOut()`：

```typescript
import { signOut, useSession } from "next-auth/react"

// 替换 useAuthStore 的 user/logout
const { data: session } = useSession()
const user = session?.user
```

### 3.7 Middleware（可选但推荐）

新增 `web/src/middleware.ts` 做服务端路由保护：

```typescript
export { auth as middleware } from "@/server/auth-config"

export const config = {
  matcher: [
    // 保护所有路由，排除登录页、API auth、静态资源
    "/((?!login|api/auth|api/register|_next/static|_next/image|favicon.ico).*)",
  ],
}
```

有了 middleware，`AuthGuard` 组件可以简化或移除（middleware 会在服务端直接重定向未认证用户）。

### 3.8 环境变量

```env
# 新增
GITHUB_ID=your_github_oauth_app_client_id
GITHUB_SECRET=your_github_oauth_app_client_secret
AUTH_SECRET=your_nextauth_secret_key  # NextAuth v5 使用 AUTH_SECRET

# 保留
JWT_SECRET=...  # 迁移期间保留，最终可移除
```

### 3.9 依赖变更

```bash
# 新增
pnpm add next-auth@beta @auth/prisma-adapter

# 可移除（迁移完成后）
# bcryptjs 保留（注册和 Credentials Provider 仍需要）
```

注：`@auth/prisma-adapter` 仅用作类型参考，实际不使用其自动建表功能。如果不需要可以不装。

### 3.10 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `web/src/server/auth-config.ts` | NextAuth 核心配置 |
| 新增 | `web/src/app/api/auth/[...nextauth]/route.ts` | NextAuth API handler |
| 新增 | `web/src/app/api/register/route.ts` | 独立注册接口 |
| 新增 | `web/src/middleware.ts` | 服务端路由保护 |
| 新增 | `web/prisma/migrations/xxx_add_account_table/` | Account 表迁移 |
| 修改 | `web/prisma/schema.prisma` | 新增 Account 模型，User 添加 accounts 关联 |
| 修改 | `web/src/server/trpc.ts` | 改用 `auth()` 获取用户 |
| 修改 | `web/src/app/layout.tsx` | 添加 SessionProvider |
| 修改 | `web/src/lib/auth-store.ts` | 改用 NextAuth signIn/signOut（或移除） |
| 修改 | `web/src/components/layout/auth-guard.tsx` | 改用 useSession（或移除，由 middleware 替代） |
| 修改 | `web/src/components/layout/header.tsx` | 改用 useSession + signOut |
| 修改 | `web/src/app/login/page.tsx` | 添加 GitHub 按钮，表单改用 signIn() |
| 修改 | `web/.env.example` | 添加 GITHUB_ID/SECRET、AUTH_SECRET |
| 修改 | `web/package.json` | 添加 next-auth 依赖 |
| 删除 | `web/src/app/api/auth/route.ts` | 被 NextAuth handler 替代 |
| 删除 | `web/src/server/auth.ts` | 旧 JWT 工具函数不再需要 |

## 4. 任务拆解

### Task 1：数据库 Schema 变更（30min）
**文件**：`web/prisma/schema.prisma`
**依赖**：无

- 新增 Account 模型
- 修改 User 模型：`passwordHash` 默认值改为 `""`，添加 `accounts` 关联
- 运行 `npx prisma migrate dev --name add_account_table`
- 验证迁移成功，现有数据不受影响

### Task 2：NextAuth 核心配置（1hr）
**文件**：`web/src/server/auth-config.ts`
**依赖**：Task 1

- 安装 `next-auth@beta`
- 配置 GitHub Provider + Credentials Provider
- 实现 signIn callback（账号合并逻辑）
- 实现 jwt/session callbacks（userId 注入）
- 配置 `pages.signIn = "/login"`
- 更新 `.env.example`

### Task 3：API Routes 改造（30min）
**文件**：`web/src/app/api/auth/[...nextauth]/route.ts`，`web/src/app/api/register/route.ts`
**依赖**：Task 2

- 创建 NextAuth catch-all route handler
- 将原 `route.ts` 中的注册逻辑提取到 `/api/register/route.ts`
- 删除旧 `web/src/app/api/auth/route.ts`

### Task 4：tRPC Context 改造（30min）
**文件**：`web/src/server/trpc.ts`
**依赖**：Task 2

- 改用 `auth()` 获取 session
- 从 session 中提取 user 信息填充 context
- 确保 `protectedProcedure` 仍正常工作
- 删除旧 `web/src/server/auth.ts`

### Task 5：前端认证改造（1.5hr）
**文件**：`layout.tsx`，`auth-store.ts`，`auth-guard.tsx`，`header.tsx`，`app-shell.tsx`
**依赖**：Task 3, Task 4

- `layout.tsx`：添加 `SessionProvider`
- `auth-guard.tsx`：改用 `useSession()` 判断认证状态
- `header.tsx`：改用 `useSession()` 获取用户信息，`signOut()` 登出
- `auth-store.ts`：评估是否可以移除，或简化为仅保留注册逻辑
- `app-shell.tsx`：适配新的 session 判断方式

### Task 6：登录页 GitHub OAuth 按钮（30min）
**文件**：`web/src/app/login/page.tsx`
**依赖**：Task 5

- 添加 GitHub 登录按钮（带 GitHub 图标）
- 邮箱密码表单改用 `signIn("credentials", { ... })`
- 注册表单改用 `POST /api/register` + 自动 `signIn`
- 添加分隔线 "或" 样式

### Task 7：Middleware + 清理（30min）
**文件**：`web/src/middleware.ts`
**依赖**：Task 5

- 创建 NextAuth middleware 做服务端路由保护
- 配置 matcher 排除公开路由
- 评估是否可以移除 `AuthGuard` 组件（如 middleware 已足够）
- 清理无用代码和导入

### 任务依赖关系

```
Task 1 (Schema)
  └── Task 2 (NextAuth Config)
        ├── Task 3 (API Routes)
        └── Task 4 (tRPC Context)
              └── Task 5 (Frontend Auth)
                    ├── Task 6 (Login Page)
                    └── Task 7 (Middleware + Cleanup)
```

**总估时**：约 4.5 小时

## 5. 验收标准

### 功能验收
- [ ] 邮箱+密码注册成功，自动登录，可以创建小说
- [ ] 邮箱+密码登录成功，可以看到自己的小说列表
- [ ] GitHub OAuth 登录成功（新用户），自动创建 User + Account 记录
- [ ] GitHub OAuth 登录成功（已有同邮箱用户），Account 关联到已有 User，小说数据不丢失
- [ ] 登出后跳转到登录页，无法访问受保护页面
- [ ] 未登录时直接访问 `/novels` 等页面，重定向到 `/login`
- [ ] 登录状态下访问 `/login`，重定向到 `/`

### 技术验收
- [ ] NextAuth v5 JWT session 正常工作
- [ ] tRPC `protectedProcedure` 正确识别登录用户
- [ ] 所有现有 tRPC 路由（novel/chapter/character 等）正常工作
- [ ] 数据库迁移不破坏现有数据
- [ ] `passwordHash` 可为空字符串（GitHub 用户）
- [ ] 无 TypeScript 编译错误
- [ ] 开发服务器正常启动

### 安全验收
- [ ] GitHub OAuth state 参数防 CSRF（NextAuth 内置）
- [ ] Credentials Provider 不泄露密码错误详情
- [ ] AUTH_SECRET 已配置且非默认值
- [ ] 注册接口有基本输入验证
