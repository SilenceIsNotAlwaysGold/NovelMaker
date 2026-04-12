'use client'

import { useParams, useRouter } from 'next/navigation'
import {
  Lightbulb,
  Bone,
  Layers,
  PenTool,
  Archive,
  BookCheck,
  Check,
  Lock,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc'

const stageIcons: Record<string, React.ElementType> = {
  brainstorm: Lightbulb,
  skeleton: Bone,
  volume_planning: Layers,
  chapter_writing: PenTool,
  volume_closing: Archive,
  book_closing: BookCheck,
}

const stageActions: Record<string, { label: string; href: (novelId: string) => string }[]> = {
  brainstorm: [
    { label: '编辑全书基因', href: (id) => `/novels/${id}` },
  ],
  skeleton: [
    { label: '管理人物', href: (id) => `/novels/${id}/characters` },
    { label: '编辑世界观', href: (id) => `/novels/${id}/worldview` },
  ],
  volume_planning: [
    { label: '管理卷章结构', href: (id) => `/novels/${id}` },
    { label: '管理伏笔', href: (id) => `/novels/${id}/foreshadow` },
  ],
  chapter_writing: [
    { label: '进入写作', href: (id) => `/novels/${id}` },
  ],
  volume_closing: [
    { label: '伏笔审计', href: (id) => `/novels/${id}/foreshadow` },
  ],
  book_closing: [
    { label: '查看伏笔状态', href: (id) => `/novels/${id}/foreshadow` },
  ],
}

export default function WorkflowPage() {
  const { novelId } = useParams() as { novelId: string }
  const router = useRouter()
  const { data, isLoading } = trpc.workflow.getStatus.useQuery({ novelId })
  const utils = trpc.useUtils()

  const advanceMutation = trpc.workflow.advanceStage.useMutation({
    onSuccess: () => utils.workflow.getStatus.invalidate({ novelId }),
  })

  if (isLoading || !data) {
    return <div className="py-8 text-center text-muted-foreground">加载中...</div>
  }

  const currentStageIndex = data.stages.findIndex((s) => s.status === 'current')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">创作流程</h2>
        <p className="text-sm text-muted-foreground">
          按照六个阶段逐步完成你的长篇小说创作
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {data.stages.map((stage, i) => (
          <div key={stage.key} className="flex flex-1 items-center">
            <div
              className={`h-2 flex-1 rounded-full ${
                stage.status === 'completed'
                  ? 'bg-primary'
                  : stage.status === 'current'
                    ? 'bg-primary/50'
                    : 'bg-muted'
              }`}
            />
            {i < data.stages.length - 1 && <div className="w-1" />}
          </div>
        ))}
      </div>

      {/* Stage cards */}
      <div className="space-y-3">
        {data.stages.map((stage, i) => {
          const Icon = stageIcons[stage.key] ?? Lightbulb
          const actions = stageActions[stage.key] ?? []
          const isCurrent = stage.status === 'current'

          return (
            <Card
              key={stage.key}
              className={
                isCurrent
                  ? 'border-primary/50 shadow-md'
                  : stage.status === 'locked'
                    ? 'opacity-50'
                    : ''
              }
            >
              <CardHeader className="flex flex-row items-center gap-4 py-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    stage.status === 'completed'
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stage.status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : stage.status === 'locked' ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {stage.label}
                    {isCurrent && <Badge>当前阶段</Badge>}
                    {stage.status === 'completed' && (
                      <Badge variant="secondary">已完成</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-0.5">{stage.description}</CardDescription>
                </div>
              </CardHeader>

              {isCurrent && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-3">
                    {/* Requirements */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">完成条件：</p>
                      <ul className="space-y-1 text-sm">
                        {stage.requirements.map((req, j) => (
                          <li key={j} className="flex items-center gap-2">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                stage.canAdvance ? 'bg-green-500' : 'bg-orange-500'
                              }`}
                            />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <Button
                          key={action.label}
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(action.href(novelId))}
                        >
                          {action.label}
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      ))}

                      {stage.canAdvance && i < data.stages.length - 1 && (
                        <Button
                          size="sm"
                          onClick={() => advanceMutation.mutate({ novelId })}
                          disabled={advanceMutation.isPending}
                        >
                          进入下一阶段
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
