'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Save, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

export default function NovelSettingsPage() {
  const { novelId } = useParams() as { novelId: string }
  const { data: settings } = trpc.settings.get.useQuery({ novelId })
  const utils = trpc.useUtils()

  const [form, setForm] = useState({
    llmModel: '',
    maxTokens: 4096,
    temperature: 0.8,
    chapterMinLen: 3000,
    chapterMaxLen: 5000,
    tokenBudget: 6000,
  })

  // Load env default model on mount
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      setForm(prev => prev.llmModel ? prev : { ...prev, llmModel: cfg.defaultModel || 'deepseek-chat' })
    })
  }, [])
  const [dirty, setDirty] = useState(false)

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate({ novelId })
      setDirty(false)
    },
  })

  useEffect(() => {
    if (settings) {
      setForm({
        llmModel: settings.llmModel,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        chapterMinLen: settings.chapterMinLen,
        chapterMaxLen: settings.chapterMaxLen,
        tokenBudget: settings.tokenBudget,
      })
      setDirty(false)
    }
  }, [settings])

  function updateField(key: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            小说设置
          </CardTitle>
          <CardDescription>调整此小说的 AI 模型和写作参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LLM Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">AI 模型</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模型 ID</Label>
                <Input
                  value={form.llmModel}
                  onChange={(e) => updateField('llmModel', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>最大输出 Token</Label>
                <Input
                  type="number"
                  value={form.maxTokens}
                  onChange={(e) => updateField('maxTokens', parseInt(e.target.value) || 4096)}
                />
              </div>
              <div className="space-y-2">
                <Label>温度 (0-1)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={form.temperature}
                  onChange={(e) => updateField('temperature', parseFloat(e.target.value) || 0.8)}
                />
              </div>
              <div className="space-y-2">
                <Label>记忆 Token 预算</Label>
                <Input
                  type="number"
                  value={form.tokenBudget}
                  onChange={(e) => updateField('tokenBudget', parseInt(e.target.value) || 6000)}
                />
              </div>
            </div>
          </div>

          {/* Chapter Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">章节字数</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>最小字数</Label>
                <Input
                  type="number"
                  value={form.chapterMinLen}
                  onChange={(e) => updateField('chapterMinLen', parseInt(e.target.value) || 3000)}
                />
              </div>
              <div className="space-y-2">
                <Label>最大字数</Label>
                <Input
                  type="number"
                  value={form.chapterMaxLen}
                  onChange={(e) => updateField('chapterMaxLen', parseInt(e.target.value) || 5000)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => updateMutation.mutate({ novelId, ...form })}
              disabled={!dirty || updateMutation.isPending}
            >
              <Save className="mr-1 h-4 w-4" />
              {updateMutation.isPending ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
