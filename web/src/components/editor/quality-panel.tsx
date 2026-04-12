'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

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
      </div>
    </ScrollArea>
  )
}
