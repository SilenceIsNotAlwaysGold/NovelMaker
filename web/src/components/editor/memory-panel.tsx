'use client'

import { Brain, BookOpen, GitBranch, FileText, Users, Eye } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc'

interface MemoryPanelProps {
  novelId: string
  chapterId: string
}

export function MemoryPanel({ novelId, chapterId }: MemoryPanelProps) {
  const { data, isLoading } = trpc.memory.preview.useQuery(
    { novelId, chapterId },
    { refetchOnWindowFocus: false },
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载记忆上下文...
      </div>
    )
  }

  if (!data) return null

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4" />
            记忆上下文
          </h3>
          <Badge variant="outline" className="text-xs">
            ~{data.totalTokens} tokens
          </Badge>
        </div>

        <Separator />

        {/* L1: Gene */}
        <MemoryLayer
          icon={<BookOpen className="h-3.5 w-3.5" />}
          title="L1 全书基因"
          tokens={data.layers.gene.tokens}
          content={data.layers.gene.content}
        />

        {/* L2: Volume */}
        <MemoryLayer
          icon={<GitBranch className="h-3.5 w-3.5" />}
          title="L2 卷记忆"
          tokens={data.layers.volume.tokens}
          content={data.layers.volume.content}
        />

        {/* L3: Arc */}
        <MemoryLayer
          icon={<GitBranch className="h-3.5 w-3.5" />}
          title="L3 弧线记忆"
          tokens={data.layers.arc.tokens}
          content={data.layers.arc.content}
        />

        {/* L4: Chapters */}
        <MemoryLayer
          icon={<FileText className="h-3.5 w-3.5" />}
          title="L4 章节记忆"
          tokens={data.layers.chapters.tokens}
          content={data.layers.chapters.content}
        />

        {/* L5: On-Demand */}
        {data.layers.onDemand.map((item, i) => (
          <MemoryLayer
            key={i}
            icon={i === 0 ? <Users className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            title={`L5 ${i === 0 ? '人物' : '伏笔'}`}
            tokens={item.tokens}
            content={item.content}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

function MemoryLayer({
  icon,
  title,
  tokens,
  content,
}: {
  icon: React.ReactNode
  title: string
  tokens: number
  content: string
}) {
  if (!content) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {icon} {title}
          </span>
          <span className="text-xs text-muted-foreground/50">空</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {icon} {title}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {tokens}t
        </Badge>
      </div>
      <div className="rounded bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap line-clamp-6">
        {content}
      </div>
    </div>
  )
}
