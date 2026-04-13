'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Loader2, BookOpen, Check, ArrowLeft, Brain,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

const genres = [
  { value: 'auto', label: 'AI 自动判断' },
  { value: 'xuanhuan', label: '玄幻' },
  { value: 'dushi', label: '都市' },
  { value: 'xuanyi', label: '悬疑' },
  { value: 'yanqing', label: '言情' },
  { value: 'wuxia', label: '武侠' },
  { value: 'kehuan', label: '科幻' },
  { value: 'lishi', label: '历史' },
]

const wordPresets = [
  { value: 200000, label: '20万字（短篇）' },
  { value: 500000, label: '50万字（中篇）' },
  { value: 1000000, label: '100万字（长篇）' },
  { value: 2000000, label: '200万字（超长篇）' },
]

type Step = 'input' | 'generating' | 'preview' | 'importing' | 'done'

export default function CreateFromIdeaPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [theme, setTheme] = useState('')
  const [totalWords, setTotalWords] = useState(500000)
  const [genre, setGenre] = useState('auto')
  const [rawResult, setRawResult] = useState('')
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [novelId, setNovelId] = useState('')

  const volumeCount = Math.max(1, Math.ceil(Math.round(totalWords / 4000) / Math.min(Math.max(Math.round(Math.round(totalWords / 4000) / Math.ceil(Math.round(totalWords / 4000) / 15)), 8), 20)))
  const totalChapters = Math.round(totalWords / 4000)

  const generate = useCallback(async () => {
    if (!theme.trim()) return
    setStep('generating')
    setRawResult('')
    setError('')

    try {
      const res = await fetch('/api/ai/generate-skeleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalWords,
          theme: theme.trim(),
          genre: genre === 'auto' ? '' : genre,
        }),
      })

      if (!res.ok || !res.body) throw new Error('生成失败，请检查 API Key 配置')

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
      setStep('input')
    }
  }, [theme, totalWords, genre])

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

  // ── Step: Input ──
  if (step === 'input') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">主题推演</h1>
            <p className="text-sm text-muted-foreground">
              输入字数目标和主题，AI 自动推演拆分完整小说骨架
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              基本设定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Word count */}
            <div className="space-y-3">
              <Label>目标字数</Label>
              <div className="flex flex-wrap gap-2">
                {wordPresets.map((p) => (
                  <Button
                    key={p.value}
                    type="button"
                    variant={totalWords === p.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTotalWords(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={totalWords}
                  onChange={(e) => setTotalWords(Math.max(50000, Number(e.target.value) || 500000))}
                  className="w-40"
                />
                <span className="text-sm text-muted-foreground">
                  字 (约 {volumeCount} 卷 / {totalChapters} 章)
                </span>
              </div>
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={genre} onValueChange={(v) => v && setGenre(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label>主题 / 核心创意</Label>
              <Textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                rows={4}
                placeholder={"描述你想写的故事，越具体越好。例如：\n\n• 一个程序员穿越到修仙世界，用编程思维理解功法体系\n• 末日废土背景，主角拥有时间回溯能力，每次死亡回到24小时前\n• 民国上海滩，女主从舞女一步步成为商业帝国掌门人"}
              />
              <p className="text-xs text-muted-foreground">
                可以是一句话的灵感，也可以是详细的设定描述
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Structure preview */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI 将自动推演拆分为：</span>
              <div className="flex gap-4">
                <Badge variant="secondary">{(totalWords / 10000).toFixed(0)} 万字</Badge>
                <Badge variant="secondary">{volumeCount} 卷</Badge>
                <Badge variant="secondary">{totalChapters} 章</Badge>
                <Badge variant="secondary">~4000字/章</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <Button size="lg" className="w-full" onClick={generate} disabled={!theme.trim()}>
          <Sparkles className="mr-2 h-4 w-4" />
          一键推演生成
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
            <h1 className="text-2xl font-bold">AI 正在推演...</h1>
            <p className="text-sm text-muted-foreground">
              正在根据主题推演 {(totalWords / 10000).toFixed(0)} 万字的完整骨架，约 30-90 秒
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <ScrollArea className="h-[500px]">
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
    const wvs = (d.worldview as Array<Record<string, string>>) || []

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep('input')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{d.title as string}</h1>
            <p className="mt-1 text-muted-foreground">{d.logline as string}</p>
          </div>
        </div>

        {/* Structure summary */}
        {typeof d.structureSummary === 'string' && d.structureSummary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">结构说明</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{d.structureSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Characters */}
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
                  <p className="text-xs text-muted-foreground/70 mt-0.5">说话方式: {ch.speechPattern}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Worldview */}
        {wvs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">世界观 ({wvs.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {wvs.map((wv, i) => (
                <div key={i} className="rounded bg-muted/50 p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{wv.category}</Badge>
                    <span className="font-medium text-sm">{wv.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{wv.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Volumes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">卷章规划 ({vols.length} 卷)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vols.map((vol, i) => {
              const chapters = (vol.chapters as string[]) || []
              return (
                <div key={i} className="space-y-1">
                  <div className="font-medium text-sm">{vol.title as string}</div>
                  <p className="text-xs text-muted-foreground">{vol.summary as string}</p>
                  <details className="group">
                    <summary className="text-xs text-primary cursor-pointer hover:underline">
                      展开 {chapters.length} 章
                    </summary>
                    <div className="mt-1 ml-2 space-y-0.5">
                      {chapters.map((ch, j) => (
                        <p key={j} className="text-xs text-muted-foreground">{ch}</p>
                      ))}
                    </div>
                  </details>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Foreshadows */}
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
          <Button variant="outline" onClick={() => setStep('input')}>
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
        {(totalWords / 10000).toFixed(0)} 万字的小说骨架已导入，包含角色、世界观、卷章结构、伏笔规划。
      </p>
      <Button className="mt-6" onClick={() => router.push(`/novels/${novelId}`)}>
        进入小说工作台
      </Button>
    </div>
  )
}
