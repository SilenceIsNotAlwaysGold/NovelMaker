'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, Sparkles, PenTool, Brain, BarChart3, ArrowRight, Wand2 } from 'lucide-react'
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

export default function HomePage() {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: novels } = trpc.novel.list.useQuery()
  const recentNovels = novels?.slice(0, 6)

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            NovelMaker
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            AI 驱动的中文长篇小说创作工具。分层记忆系统让 AI 记住每一个角色、
            每一条伏笔，帮你写出 20 万到 100 万字的完整长篇。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              开始创作
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/novels/create-from-idea')}>
              <Wand2 className="mr-2 h-4 w-4" />
              主题推演
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/novels/create-from-reference')}>
              <Sparkles className="mr-2 h-4 w-4" />
              仿写热门小说
            </Button>
            {novels && novels.length > 0 && (
              <Button size="lg" variant="ghost" onClick={() => router.push('/novels')}>
                继续写作
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-12 right-20 h-48 w-48 rounded-full bg-primary/8 blur-2xl" />
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="group transition-all hover:shadow-md hover:border-primary/20">
          <CardHeader className="pb-2">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">分层记忆系统</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              5 层记忆架构自动组装上下文，无论小说多长，AI 都能记住前文的每一个细节。
            </p>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:shadow-md hover:border-primary/20">
          <CardHeader className="pb-2">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <PenTool className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">类型化写作引擎</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              内置 7 种类型公约、10 种 Hook 技巧、角色弧线模板，AI 懂网文套路。
            </p>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:shadow-md hover:border-primary/20">
          <CardHeader className="pb-2">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">质量守护</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              AI 味检测、字数控制、伏笔追踪、术语一致性检查，确保作品质量。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent works */}
      {recentNovels && recentNovels.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">最近作品</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push('/novels')}>
              查看全部
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentNovels.map((novel) => (
              <Card
                key={novel.id}
                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
                onClick={() => router.push(`/novels/${novel.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {novel.title}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      {genreMap[novel.genre] ?? novel.genre}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[2.5em]">
                    {novel.logline || '暂无简介'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {novel._count.volumes} 卷
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {novel._count.characters} 角色
                    </span>
                    <span className="ml-auto">
                      {new Date(novel.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        novels && (
          <div className="rounded-2xl border-2 border-dashed p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">还没有作品</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              点击"开始创作"创建你的第一部长篇小说
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              创建第一部小说
            </Button>
          </div>
        )
      )}

      <NovelCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
