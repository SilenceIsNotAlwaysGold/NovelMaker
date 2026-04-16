'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

const PUBLIC_PATHS = ['/login']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchUser } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (loading) return

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

    if (!user && !isPublic) {
      router.replace('/login')
    } else if (user && isPublic) {
      router.replace('/')
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Not logged in and not on public page — show nothing while redirecting
  if (!user && !isPublic) return null
  // Logged in but on public page — show nothing while redirecting
  if (user && isPublic) return null

  return <>{children}</>
}
