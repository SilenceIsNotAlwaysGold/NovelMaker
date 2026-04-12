'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Save, Dna } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

export default function GenePage() {
  const { novelId } = useParams() as { novelId: string }
  const { data: gene } = trpc.memory.getGene.useQuery({ novelId })
  const utils = trpc.useUtils()

  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)

  const saveMutation = trpc.memory.updateGene.useMutation({
    onSuccess: () => {
      utils.memory.getGene.invalidate({ novelId })
      setDirty(false)
    },
  })

  useEffect(() => {
    if (gene) {
      setContent(gene.content)
      setDirty(false)
    }
  }, [gene])

  const charCount = content.length

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dna className="h-5 w-5" />
            全书基因
          </CardTitle>
          <CardDescription>
            全书基因是你小说的 DNA，包含核心设定、主角、力量体系、核心冲突和节奏路线图。
            建议控制在 2000 字以内，AI 创作时会始终加载此文档。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true) }}
            rows={20}
            className="font-mono text-sm"
            placeholder={`【题材与风格】
玄幻 / 热血升级 / 第一人称

【主角】
姓名：xxx
性格：xxx
初始状态：xxx
终极目标：xxx

【核心冲突】
xxx

【力量体系】
xxx

【全书节奏】
卷一：xxx
卷二：xxx
...`}
          />
          <div className="flex items-center justify-between">
            <Badge variant={charCount > 2000 ? 'destructive' : 'secondary'}>
              {charCount} / 2000 字
            </Badge>
            <Button
              onClick={() => saveMutation.mutate({ novelId, content })}
              disabled={!dirty || saveMutation.isPending}
            >
              <Save className="mr-1 h-4 w-4" />
              {saveMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
