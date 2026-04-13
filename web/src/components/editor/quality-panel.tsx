'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc'
import { AlertTriangle, CheckCircle, XCircle, MessageSquare, Layers } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface QualityPanelProps {
  chapterId: string
}

const levelColors = {
  excellent: 'text-green-600',
  fair: 'text-yellow-600',
  poor: 'text-orange-600',
  severe: 'text-red-600',
}

const levelLabels = {
  excellent: '优秀',
  fair: '尚可',
  poor: '较差',
  severe: '严重',
}

export function QualityPanel({ chapterId }: QualityPanelProps) {
  const { data, isLoading } = trpc.quality.checkChapter.useQuery(
    { chapterId },
    { refetchOnWindowFocus: false },
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        检查中...
      </div>
    )
  }

  if (!data) return null

  const StatusIcon = data.overall === 'pass' ? CheckCircle : data.overall === 'warn' ? AlertTriangle : XCircle
  const statusColor = data.overall === 'pass' ? 'text-green-600' : data.overall === 'warn' ? 'text-yellow-600' : 'text-red-600'

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            质量评分
          </h3>
          <Badge variant={data.overall === 'pass' ? 'default' : 'destructive'}>
            {data.score} 分
          </Badge>
        </div>

        <Separator />

        {/* Word Count */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">字数检查</span>
            <Badge variant={data.wordCount.status === 'pass' ? 'secondary' : 'destructive'}>
              {data.wordCount.status === 'pass' ? '通过' : '警告'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{data.wordCount.message}</p>
        </div>

        <Separator />

        {/* AI Flavor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">AI 味检测</span>
            <span className={`text-xs font-medium ${levelColors[data.aiFlavor.level]}`}>
              {levelLabels[data.aiFlavor.level]}（{data.aiFlavor.score} 分）
            </span>
          </div>

          {data.aiFlavor.issues.length === 0 ? (
            <p className="text-xs text-green-600">未检测到明显 AI 写作痕迹</p>
          ) : (
            <div className="space-y-2">
              {data.aiFlavor.issues.map((issue, i) => (
                <div key={i} className="rounded bg-muted/50 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {issue.type === 'blacklist' && `「${issue.pattern}」`}
                      {issue.type === 'tell_not_show' && '告知而非展示'}
                      {issue.type === 'transition_overuse' && '转折词过多'}
                      {issue.type === 'over_decoration' && '过度修饰'}
                      {issue.type === 'info_dump_dialogue' && '信息灌输对话'}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {issue.count} 次
                    </Badge>
                  </div>
                  {issue.examples.length > 0 && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {issue.examples.map((ex, j) => (
                        <div key={j} className="truncate">{ex}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Scene Structure */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="h-3.5 w-3.5" />
              场景结构
            </span>
            <span className="text-xs text-muted-foreground">{data.sceneStructure.beatScore} 分</span>
          </div>
          <Progress value={data.sceneStructure.beatScore} className="h-1.5" />
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <div className={`rounded px-1.5 py-1 text-center ${data.sceneStructure.hasOpeningHook ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              开篇钩子
            </div>
            <div className={`rounded px-1.5 py-1 text-center ${data.sceneStructure.hasConflict ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              冲突场景
            </div>
            <div className={`rounded px-1.5 py-1 text-center ${data.sceneStructure.hasCliffhanger ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              结尾悬念
            </div>
          </div>
          {data.sceneStructure.issues.length > 0 && (
            <div className="space-y-1">
              {data.sceneStructure.issues.map((issue, i) => (
                <p key={i} className="text-[11px] text-orange-600">• {issue}</p>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Dialogue Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <MessageSquare className="h-3.5 w-3.5" />
              对话质量
            </span>
            <span className="text-xs text-muted-foreground">
              占比 {Math.round(data.dialogueQuality.dialogueRatio * 100)}%
            </span>
          </div>
          <div className="flex gap-2 text-[11px]">
            <div className="rounded bg-muted px-2 py-1">
              平均长度 {Math.round(data.dialogueQuality.avgDialogueLength)} 字
            </div>
            <div className={`rounded px-2 py-1 ${data.dialogueQuality.hasActionBeats ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
              {data.dialogueQuality.hasActionBeats ? '有动作节拍' : '缺动作节拍'}
            </div>
          </div>
          {data.dialogueQuality.issues.length > 0 && (
            <div className="space-y-1">
              {data.dialogueQuality.issues.map((issue, i) => (
                <p key={i} className="text-[11px] text-orange-600">• {issue}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
