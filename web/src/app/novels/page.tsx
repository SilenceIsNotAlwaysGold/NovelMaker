'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NovelCreateDialog } from '@/components/novel/novel-create-dialog'
import { trpc } from '@/lib/trpc'

const genreMap: Record<string, string> = {
  xuanhuan: '玄幻',
  dushi: '都市',
  xuanyi: '悬疑',
  yanqing: '言情',
  wuxia: '武侠',
  kehuan: '科幻',
  lishi: '历史',
}

const stageMap: Record<string, string> = {
  brainstorm: '创意风暴',
  skeleton: '骨架搭建',
  volume_planning: '卷级规划',
  chapter_writing: '逐章创作',
  volume_closing: '卷末收尾',
  book_closing: '全书收尾',
}

export default function NovelsPage() {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: novels, isLoading } = trpc.novel.list.useQuery()
  const utils = trpc.useUtils()
  const deleteMutation = trpc.novel.delete.useMutation({
    onSuccess: () => utils.novel.list.invalidate(),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的小说</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建新小说
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : !novels?.length ? (
        <div className="py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">还没有创建任何小说</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            开始创作
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {novels.map((novel) => (
            <Card
              key={novel.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/novels/${novel.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{novel.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {novel.logline || '暂无简介'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{genreMap[novel.genre] ?? novel.genre}</Badge>
                  {novel.workflow && (
                    <Badge variant="outline">
                      {stageMap[novel.workflow.currentStage] ?? novel.workflow.currentStage}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{novel._count.volumes} 卷</span>
                    <span>{novel._count.characters} 角色</span>
                    <span>
                      更新于{' '}
                      {new Date(novel.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('确定要删除这部小说吗？此操作不可恢复。')) {
                        deleteMutation.mutate({ id: novel.id })
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NovelCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
