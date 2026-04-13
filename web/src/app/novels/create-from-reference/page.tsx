'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, BookOpen, Check, ArrowLeft, Flame, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'

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

// ── 内置热门小说数据 ──
const BUILTIN_NOVELS: TrendingNovel[] = [
  {
    title: '斗破苍穹', author: '天蚕土豆', genre: 'xuanhuan', genreLabel: '玄幻',
    platform: '起点', heat: '经典玄幻标杆',
    premise: '天才少年斗气被夺，逆天改命重回巅峰',
    corePattern: '废物逆袭+等级碾压+宗门争霸+美女收集',
    pacing: '前期快节奏打脸，中期宗门政治，后期大陆争霸',
    protagonist: '热血型', sellingPoints: ['等级体系清晰', '打脸爽感强', '节奏明快'], targetAudience: '男频玄幻读者',
  },
  {
    title: '诡秘之主', author: '乌贼', genre: 'xuanyi', genreLabel: '悬疑',
    platform: '起点', heat: '起点评分TOP级',
    premise: '穿越者在维多利亚蒸汽朋克世界成为非凡者',
    corePattern: '序列升级+身份伪装+克苏鲁恐怖+多马甲切换',
    pacing: '前期悬疑探案，中期势力暗战，后期神战宏大',
    protagonist: '智谋型', sellingPoints: ['世界观宏大', '伏笔惊艳', '序列体系精妙'], targetAudience: '喜欢烧脑设定的读者',
  },
  {
    title: '全职高手', author: '蝴蝶蓝', genre: 'dushi', genreLabel: '都市',
    platform: '起点', heat: '电竞文开山之作',
    premise: '被俱乐部驱逐的荣耀巅峰选手从零开始重返职业赛场',
    corePattern: '退役重来+技术碾压+团队组建+热血竞技',
    pacing: '前期单人逆袭，中期组队发展，后期总决赛',
    protagonist: '佛系型', sellingPoints: ['电竞氛围真实', '群像刻画出色', '无后宫无恋爱'], targetAudience: '游戏/电竞爱好者',
  },
  {
    title: '庆余年', author: '猫腻', genre: 'lishi', genreLabel: '历史',
    platform: '起点', heat: '影视化大热',
    premise: '现代灵魂穿越到古代权谋世界，以一己之力搅动天下',
    corePattern: '穿越+宫廷权谋+身世之谜+文武双全',
    pacing: '前期京都探秘，中期朝堂争斗，后期天下大势',
    protagonist: '智谋型', sellingPoints: ['权谋深度高', '文笔细腻', '角色饱满'], targetAudience: '权谋/历史爱好者',
  },
  {
    title: '凡人修仙传', author: '忘语', genre: 'xuanhuan', genreLabel: '玄幻',
    platform: '起点', heat: '修仙文经典',
    premise: '资质平庸的少年凭借坚韧和谨慎在修仙界步步为营',
    corePattern: '凡人流+稳扎稳打+机缘巧合+以弱胜强',
    pacing: '前期凡人历练，中期界域探索，后期飞升真仙',
    protagonist: '隐忍型', sellingPoints: ['代入感强', '升级体系扎实', '无挂逼感'], targetAudience: '偏好写实修仙的读者',
  },
  {
    title: '赘婿', author: '愤怒的香蕉', genre: 'lishi', genreLabel: '历史',
    platform: '起点', heat: '商战+历史热门',
    premise: '商界精英穿越成上门赘婿，以商业手段改变时代',
    corePattern: '赘婿逆袭+商战智斗+家国情怀+穿越种田',
    pacing: '前期商业经营，中期家族纷争，后期天下格局',
    protagonist: '智谋型', sellingPoints: ['商战烧脑', '格局宏大', '角色立体'], targetAudience: '商战/历史爱好者',
  },
  {
    title: '知否知否应是绿肥红瘦', author: '关心则乱', genre: 'yanqing', genreLabel: '言情',
    platform: '晋江', heat: '古代宅斗经典',
    premise: '现代白领穿越成庶女，在内宅斗争中步步为营',
    corePattern: '宅斗+嫡庶之争+慢热恋爱+女性成长',
    pacing: '前期闺阁生活，中期婚姻选择，后期主母持家',
    protagonist: '隐忍型', sellingPoints: ['宅斗细腻', '恋爱线甜', '古代生活细节真实'], targetAudience: '女频宅斗读者',
  },
  {
    title: '三体', author: '刘慈欣', genre: 'kehuan', genreLabel: '科幻',
    platform: '其他', heat: '中国科幻里程碑',
    premise: '人类文明面对三体文明入侵的存亡危机',
    corePattern: '硬科幻设定+文明对抗+技术奇观+哲学思辨',
    pacing: '前期悬疑揭秘，中期科技对抗，后期宇宙格局',
    protagonist: '智谋型', sellingPoints: ['硬科幻设定震撼', '黑暗森林理论', '格局宏大'], targetAudience: '科幻爱好者',
  },
  {
    title: '天官赐福', author: '墨香铜臭', genre: 'xuanhuan', genreLabel: '玄幻',
    platform: '晋江', heat: '耽美仙侠顶流',
    premise: '三度飞升的太子殿下第三次被贬后重新踏上神路',
    corePattern: '仙侠+身份反转+虐恋情深+神话重构',
    pacing: '前期探案解密，中期真相揭露，后期高燃决战',
    protagonist: '热血型', sellingPoints: ['世界观完整', '角色深度高', '感情线动人'], targetAudience: '耽美/仙侠读者',
  },
  {
    title: '雪中悍刀行', author: '烽火戏诸侯', genre: 'wuxia', genreLabel: '武侠',
    platform: '起点', heat: '新武侠代表',
    premise: '北凉王世子携刀踏入江湖，搅动天下武林',
    corePattern: '世家子弟+江湖行走+武力碾压+家国天下',
    pacing: '前期江湖游历，中期庙堂纷争，后期北凉铁骑',
    protagonist: '热血型', sellingPoints: ['武侠意境出色', '文笔飘逸', '群像精彩'], targetAudience: '武侠/男频读者',
  },
]

const genreFilters = [
  { value: 'all', label: '全部类型' },
  { value: 'xuanhuan', label: '玄幻' },
  { value: 'dushi', label: '都市' },
  { value: 'xuanyi', label: '悬疑' },
  { value: 'yanqing', label: '言情' },
  { value: 'wuxia', label: '武侠' },
  { value: 'kehuan', label: '科幻' },
  { value: 'lishi', label: '历史' },
]

type Step = 'select' | 'customize' | 'generating' | 'preview' | 'importing' | 'done'

export default function CreateFromReferencePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [genreFilter, setGenreFilter] = useState('all')
  const [selectedNovel, setSelectedNovel] = useState<TrendingNovel | null>(null)
  const [userIdea, setUserIdea] = useState('')
  const [rawResult, setRawResult] = useState('')
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [novelId, setNovelId] = useState('')

  const filteredNovels = useMemo(() => {
    if (genreFilter === 'all') return BUILTIN_NOVELS
    return BUILTIN_NOVELS.filter((n) => n.genre === genreFilter)
  }, [genreFilter])

  // Generate skeleton based on selected novel
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

  // Import
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

  // ── Step: Select (initial) ──
  if (step === 'select') {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">仿写热门小说</h1>
            <p className="text-sm text-muted-foreground">
              选一部热门作品作为参考，AI 分析套路后一键生成原创骨架
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="shrink-0">筛选类型</Label>
          <Select value={genreFilter} onValueChange={(v) => v && setGenreFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {genreFilters.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            共 {filteredNovels.length} 部
          </span>
        </div>

        <div className="grid gap-3">
          {filteredNovels.map((novel, i) => (
            <Card
              key={i}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => {
                setSelectedNovel(novel)
                setStep('customize')
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
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
