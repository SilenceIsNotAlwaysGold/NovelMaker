'use client'

import { useParams } from 'next/navigation'
import { NovelNav } from '@/components/layout/novel-nav'
import { trpc } from '@/lib/trpc'

export default function NovelLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const novelId = params.novelId as string
  const { data: novel } = trpc.novel.getById.useQuery({ id: novelId })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{novel?.title ?? '加载中...'}</h1>
        {novel?.logline && (
          <p className="mt-1 text-muted-foreground">{novel.logline}</p>
        )}
      </div>
      <NovelNav novelId={novelId} />
      {children}
    </div>
  )
}
