'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, FileText, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'

export default function NovelOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const novelId = params.novelId as string

  const { data: novel } = trpc.novel.getById.useQuery({ id: novelId })
  const utils = trpc.useUtils()

  const [volumeDialogOpen, setVolumeDialogOpen] = useState(false)
  const [volumeTitle, setVolumeTitle] = useState('')
  const [chapterDialogVolumeId, setChapterDialogVolumeId] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')

  const createVolume = trpc.volume.create.useMutation({
    onSuccess: () => {
      utils.novel.getById.invalidate({ id: novelId })
      setVolumeDialogOpen(false)
      setVolumeTitle('')
    },
  })

  const createChapter = trpc.chapter.create.useMutation({
    onSuccess: () => {
      utils.novel.getById.invalidate({ id: novelId })
      setChapterDialogVolumeId(null)
      setChapterTitle('')
    },
  })

  const { data: volumes } = trpc.volume.list.useQuery({ novelId })

  if (!novel) return <div className="py-8 text-center text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <StatsPanel novelId={novelId} novel={novel} />

      {/* Tension Curve */}
      <TensionCurve novelId={novelId} />

      {/* Volumes & Chapters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">卷章结构</h2>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-8 px-3">
                <Download className="h-4 w-4" />
                导出
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => window.open(`/api/export/${novelId}?format=txt`)}>
                  导出 TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/api/export/${novelId}?format=md`)}>
                  导出 Markdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setVolumeDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              添加卷
            </Button>
          </div>
        </div>

        {volumes && volumes.length > 0 ? (
          <div className="space-y-3">
            {volumes.map((vol) => (
              <VolumeCard
                key={vol.id}
                volume={vol}
                novelId={novelId}
                onAddChapter={() => {
                  setChapterDialogVolumeId(vol.id)
                  setChapterTitle(`第${(vol._count.chapters + 1).toString().padStart(2, '0')}章`)
                }}
                onOpenChapter={(chapterId) =>
                  router.push(`/novels/${novelId}/editor/${chapterId}`)
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-medium">还没有创建卷</p>
            <p className="mt-1 text-sm text-muted-foreground">
              添加第一卷开始你的创作之旅
            </p>
            <Button className="mt-4" size="sm" onClick={() => setVolumeDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              添加第一卷
            </Button>
          </div>
        )}
      </div>

      {/* Create Volume Dialog */}
      <Dialog open={volumeDialogOpen} onOpenChange={setVolumeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (volumeTitle.trim()) {
                createVolume.mutate({ novelId, title: volumeTitle.trim() })
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>添加新卷</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="vol-title">卷名</Label>
              <Input
                id="vol-title"
                value={volumeTitle}
                onChange={(e) => setVolumeTitle(e.target.value)}
                placeholder={`卷${(novel.volumes.length + 1).toString()}`}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!volumeTitle.trim() || createVolume.isPending}>
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Chapter Dialog */}
      <Dialog
        open={!!chapterDialogVolumeId}
        onOpenChange={(open) => !open && setChapterDialogVolumeId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (chapterTitle.trim() && chapterDialogVolumeId) {
                createChapter.mutate({
                  volumeId: chapterDialogVolumeId,
                  title: chapterTitle.trim(),
                })
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>添加新章节</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="ch-title">章节标题</Label>
              <Input
                id="ch-title"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!chapterTitle.trim() || createChapter.isPending}>
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VolumeCard({
  volume,
  novelId,
  onAddChapter,
  onOpenChapter,
}: {
  volume: { id: string; title: string; status: string; _count: { chapters: number; arcs: number } }
  novelId: string
  onAddChapter: () => void
  onOpenChapter: (id: string) => void
}) {
  const { data: chapters } = trpc.chapter.list.useQuery({ volumeId: volume.id })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">{volume.title}</CardTitle>
          <Badge variant="outline">{statusMap[volume.status] ?? volume.status}</Badge>
          <span className="text-sm text-muted-foreground">{volume._count.chapters} 章</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onAddChapter}>
          <Plus className="mr-1 h-3 w-3" />
          添加章节
        </Button>
      </CardHeader>
      {chapters && chapters.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-1">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => onOpenChapter(ch.id)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{ch.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {ch.wordCount} 字
                  </Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function StatsPanel({ novelId, novel }: { novelId: string; novel: { volumes: { _count: { chapters: number } }[]; _count: { characters: number; worldview: number; foreshadow: number } } }) {
  const { data: stats } = trpc.stats.getNovelStats.useQuery({ novelId })

  return (
    <div className="grid grid-cols-5 gap-3">
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">总字数</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{stats ? (stats.totalWords >= 10000 ? `${(stats.totalWords / 10000).toFixed(1)}万` : stats.totalWords) : '-'}</div>
          {stats && <p className="text-[10px] text-muted-foreground">约 {stats.estimatedPages} 页</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">章节进度</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{stats?.completedChapters ?? 0}/{stats?.totalChapters ?? 0}</div>
          <p className="text-[10px] text-muted-foreground">{stats?.draftChapters ?? 0} 草稿中</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">人物</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{novel._count.characters}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">世界观</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{novel._count.worldview}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground">伏笔回收率</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-xl font-bold">{stats?.foreshadowCompletionRate ?? 100}%</div>
          <p className="text-[10px] text-muted-foreground">{novel._count.foreshadow} 条伏笔</p>
        </CardContent>
      </Card>
    </div>
  )
}

function TensionCurve({ novelId }: { novelId: string }) {
  const { data: points } = trpc.stats.getTensionCurve.useQuery({ novelId })
  if (!points || points.length < 2) return null

  const width = 700
  const height = 200
  const padX = 40
  const padY = 20
  const plotW = width - padX * 2
  const plotH = height - padY * 2

  const maxTension = Math.max(...points.map((p) => p.tension), 100)
  const stepX = plotW / Math.max(points.length - 1, 1)

  const pathPoints = points.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + plotH - (p.tension / maxTension) * plotH,
  }))

  // Smooth curve using quadratic bezier
  let pathD = `M ${pathPoints[0].x} ${pathPoints[0].y}`
  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1]
    const curr = pathPoints[i]
    const cpX = (prev.x + curr.x) / 2
    pathD += ` Q ${cpX} ${prev.y} ${curr.x} ${curr.y}`
  }

  // Gradient fill path
  const fillD = pathD + ` L ${pathPoints[pathPoints.length - 1].x} ${padY + plotH} L ${pathPoints[0].x} ${padY + plotH} Z`

  // Color based on tension
  const getColor = (t: number) => {
    if (t >= 70) return '#ef4444'
    if (t >= 40) return '#f59e0b'
    return '#22c55e'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">张力曲线</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 220 }}>
          <defs>
            <linearGradient id="tensionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = padY + plotH - (v / maxTension) * plotH
            return (
              <g key={v}>
                <line x1={padX} y1={y} x2={padX + plotW} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4,4" />
                <text x={padX - 6} y={y + 3} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="9">{v}</text>
              </g>
            )
          })}
          {/* Fill area */}
          <path d={fillD} fill="url(#tensionGrad)" />
          {/* Line */}
          <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
          {/* Data points */}
          {pathPoints.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="4" fill={getColor(points[i].tension)} stroke="white" strokeWidth="1.5" />
              {/* Label every other point or all if few */}
              {(points.length <= 10 || i % 2 === 0) && (
                <text x={pt.x} y={padY + plotH + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
                  {points[i].chapterTitle.length > 5 ? points[i].chapterTitle.slice(0, 5) + '…' : points[i].chapterTitle}
                </text>
              )}
            </g>
          ))}
        </svg>
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />低张力(0-40)</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />中张力(40-70)</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />高张力(70+)</span>
        </div>
      </CardContent>
    </Card>
  )
}

const statusMap: Record<string, string> = {
  planning: '规划中',
  writing: '写作中',
  closing: '收尾中',
  completed: '已完成',
}
