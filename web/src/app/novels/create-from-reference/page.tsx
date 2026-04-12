'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, BookOpen, Check, ArrowLeft, Search, Flame, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const genres = [
  { value: '', label: '全部类型' },
  { value: '玄幻', label: '玄幻' },
  { value: '都市', label: '都市' },
  { value: '悬疑', label: '悬疑' },
  { value: '言情', label: '言情' },
  { value: '武侠', label: '武侠' },
  { value: '科幻', label: '科幻' },
  { value: '历史', label: '历史' },
]

const genreValueMap: Record<string, string> = {
  '玄幻': 'xuanhuan', '都市': 'dushi', '悬疑': 'xuanyi', '言情': 'yanqing',
  '武侠': 'wuxia', '科幻': 'kehuan', '历史': 'lishi',
  xuanhuan: 'xuanhuan', dushi: 'dushi', xuanyi: 'xuanyi', yanqing: 'yanqing',
  wuxia: 'wuxia', kehuan: 'kehuan', lishi: 'lishi',
}

interface TrendingNovel {
  title: string
  author: string
  genre: string
  genreLabel: string
  platform: string
  heat: string
  premise: string
  corePattern: string
  pacing: string
  protagonist: string
  sellingPoints: string[]
  targetAudience: string
}

type Step = 'browse' | 'loading-trends' | 'select' | 'customize' | 'generating' | 'preview' | 'importing' | 'done'

export default function CreateFromReferencePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('browse')
  const [genreFilter, setGenreFilter] = useState('')
  const [trendingNovels, setTrendingNovels] = useState<TrendingNovel[]>([])
  const [selectedNovel, setSelectedNovel] = useState<TrendingNovel | null>(null)
  const [userIdea, setUserIdea] = useState('')
  const [rawResult, setRawResult] = useState('')
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [novelId, setNovelId] = useState('')

  // Step 1: Fetch trending novels
  const fetchTrending = useCallback(async () => {
    setStep('loading-trends')
    setError('')

    try {
      const res = await fetch('/api/ai/trending-novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: genreFilter }),
      })

      if (!res.ok || !res.body) throw new Error('获取热门小说失败')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
      }

      const jsonMatch = full.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('解析失败，请重试')

      const novels: TrendingNovel[] = JSON.parse(jsonMatch[0])
      setTrendingNovels(novels)
      setStep('select')
    } catch (err) {
      setError((err as Error).message)
      setStep('browse')
    }
  }, [genreFilter])

  // Step 2: Generate skeleton based on selected novel
  const generateFromSelection = useCallback(async () => {
    if (!selectedNovel) return
    setStep('generating')
    setRawResult('')
    setError('')

    const referenceDescription = `参考作品：《${selectedNovel.title}》（${selectedNovel.author}）
类型：${selectedNovel.genreLabel}
核心设定：${selectedNovel.premise}
成功套路：${selectedNovel.corePattern}
节奏特点：${selectedNovel.pacing}
主角类型：${selectedNovel.protagonist}
卖点：${selectedNovel.sellingPoints.join('、')}`

    try {
      const res = await fetch('/api/ai/analyze-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceText: referenceDescription,
          genre: genreValueMap[selectedNovel.genre] || selectedNovel.genre,
          userIdea: userIdea || `借鉴《${selectedNovel.title}》的${selectedNovel.corePattern}模式`,
        }),
      })

      if (!res.ok || !res.body) throw new Error('生成失败')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setRawResult(full)
      }

      const jsonMatch = full.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 返回格式不正确，请重试')

      setParsedData(JSON.parse(jsonMatch[0]))
      setStep('preview')
    } catch (err) {
      setError((err as Error).message)
      setStep('customize')
    }
  }, [selectedNovel, userIdea])

  // Step 3: Import
  const importToProject = useCallback(async () => {
    if (!parsedData) return
    setStep('importing')

    try {
      const res = await fetch('/api/ai/import-skeleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      })
      const result = await res.json()
      setNovelId(result.novelId)
      setStep('done')
    } catch {
      setError('导入失败')
      setStep('preview')
    }
  }, [parsedData])

  // ── Step: Browse (initial) ──
  if (step === 'browse') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">仿写热门小说</h1>
            <p className="text-sm text-muted-foreground">
              AI 帮你找当前最火的网文，分析成功套路，一键生成同类型原创骨架
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label>筛选类型</Label>
                <Select value={genreFilter} onValueChange={(v) => setGenreFilter(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="全部类型" /></SelectTrigger>
                  <SelectContent>
                    {genres.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="lg" onClick={fetchTrending}>
                <Search className="mr-2 h-4 w-4" />
                搜索热门小说
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
      </div>
    )
  }

  // ── Step: Loading trends ──
  if (step === 'loading-trends') {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium">AI 正在分析网文市场热门作品...</p>
        <p className="mt-2 text-sm text-muted-foreground">通常需要 15-30 秒</p>
      </div>
    )
  }

  // ── Step: Select from trending ──
  if (step === 'select') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep('browse')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">选择参考作品</h1>
              <p className="text-sm text-muted-foreground">
                找到 {trendingNovels.length} 部热门小说，选一部你想借鉴的
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setStep('browse')}>
            重新搜索
          </Button>
        </div>

        <div className="grid gap-3">
          {trendingNovels.map((novel, i) => (
            <Card
              key={i}
              className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                selectedNovel?.title === novel.title ? 'border-primary shadow-md' : ''
              }`}
              onClick={() => {
                setSelectedNovel(novel)
                setStep('customize')
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold">{novel.title}</span>
                      <span className="text-xs text-muted-foreground">· {novel.author}</span>
                      <Badge variant="secondary" className="text-xs">{novel.genreLabel}</Badge>
                      <Badge variant="outline" className="text-xs">{novel.platform}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm">{novel.premise}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {novel.sellingPoints.map((sp, j) => (
                        <Badge key={j} variant="secondary" className="text-xs font-normal">{sp}</Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      套路: {novel.corePattern} · 主角: {novel.protagonist}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ── Step: Customize before generating ──
  if (step === 'customize' && selectedNovel) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep('select')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">定制你的方案</h1>
            <p className="text-sm text-muted-foreground">
              借鉴《{selectedNovel.title}》的模式，加入你的创意
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              参考作品: {selectedNovel.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">核心设定:</span> {selectedNovel.premise}</div>
            <div><span className="text-muted-foreground">成功套路:</span> {selectedNovel.corePattern}</div>
            <div><span className="text-muted-foreground">节奏:</span> {selectedNovel.pacing}</div>
            <div><span className="text-muted-foreground">主角类型:</span> {selectedNovel.protagonist}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">你的创意方向（可选）</CardTitle>
            <CardDescription>
              留空则完全借鉴参考作品的模式生成。填写后 AI 会融合你的想法。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={userIdea}
              onChange={(e) => setUserIdea(e.target.value)}
              rows={3}
              placeholder="例：主角是现代程序员穿越，用编程思维理解修炼体系..."
            />
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <Button size="lg" className="w-full" onClick={generateFromSelection}>
          <Sparkles className="mr-2 h-4 w-4" />
          一键生成原创小说骨架
        </Button>
      </div>
    )
  }

  // ── Step: Generating ──
  if (step === 'generating') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <h1 className="text-2xl font-bold">AI 正在创作...</h1>
            <p className="text-sm text-muted-foreground">
              正在借鉴《{selectedNovel?.title}》的模式生成原创骨架，约 30-60 秒
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <ScrollArea className="h-96">
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                {rawResult || '等待 AI 响应...'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Step: Preview ──
  if (step === 'preview' && parsedData) {
    const d = parsedData as Record<string, unknown>
    const chars = (d.characters as Array<Record<string, string>>) || []
    const vols = (d.volumes as Array<Record<string, unknown>>) || []
    const fss = (d.foreshadows as Array<Record<string, string>>) || []

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Badge className="mb-2">借鉴《{selectedNovel?.title}》模式</Badge>
          <h1 className="text-2xl font-bold">{d.title as string}</h1>
          <p className="mt-1 text-muted-foreground">{d.logline as string}</p>
        </div>

        {typeof d.styleAnalysis === 'string' && d.styleAnalysis && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">风格分析</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{d.styleAnalysis}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">角色 ({chars.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chars.map((ch, i) => (
              <div key={i} className="rounded bg-muted/50 p-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{ch.name}</span>
                  <Badge variant="outline" className="text-xs">{ch.role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ch.personality}</p>
                {ch.speechPattern && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">说话: {ch.speechPattern}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">卷章规划 ({vols.length} 卷)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vols.map((vol, i) => (
              <div key={i}>
                <div className="font-medium text-sm">{vol.title as string}</div>
                <p className="text-xs text-muted-foreground">{vol.summary as string}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {((vol.chapters as string[]) || []).length} 章
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">伏笔规划 ({fss.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {fss.map((fs, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium">{fs.title}</span>
                <span className="text-muted-foreground"> · 埋于{fs.plantedAt} → {fs.targetResolve}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('customize')}>
            重新生成
          </Button>
          <Button className="flex-1" onClick={importToProject}>
            <Check className="mr-2 h-4 w-4" />
            确认，导入为新项目
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: Importing ──
  if (step === 'importing') {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">正在创建小说项目...</p>
      </div>
    )
  }

  // ── Step: Done ──
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-6 text-xl font-bold">创建成功！</h2>
      <p className="mt-2 text-muted-foreground">
        小说骨架已导入，包含角色声纹、卷章结构、伏笔规划。
      </p>
      <Button className="mt-6" onClick={() => router.push(`/novels/${novelId}`)}>
        进入小说工作台
      </Button>
    </div>
  )
}
