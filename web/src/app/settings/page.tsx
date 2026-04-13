'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, CheckCircle, XCircle } from 'lucide-react'

interface AppConfig {
  hasOpenAI: boolean
  hasAnthropic: boolean
  openaiBaseURL: string
  defaultModel: string
  maxTokens: number
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setConfig)
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            LLM 配置
          </CardTitle>
          <CardDescription>
            配置 AI 模型的 API 密钥和参数。修改请编辑项目 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">web/.env</code> 文件后重启服务。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>OpenAI / DeepSeek API Key</Label>
            <div className="flex items-center gap-2">
              <Input type="password" value="••••••••" disabled className="font-mono" />
              <Badge variant={config?.hasOpenAI ? 'default' : 'secondary'} className="flex items-center gap-1 shrink-0">
                {config?.hasOpenAI ? <><CheckCircle className="h-3 w-3" /> 已配置</> : <><XCircle className="h-3 w-3" /> 未配置</>}
              </Badge>
            </div>
            {config?.openaiBaseURL && (
              <p className="text-xs text-muted-foreground">
                Base URL: <code className="rounded bg-muted px-1 py-0.5">{config.openaiBaseURL}</code>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Anthropic API Key</Label>
            <div className="flex items-center gap-2">
              <Input type="password" value="••••••••" disabled className="font-mono" />
              <Badge variant={config?.hasAnthropic ? 'default' : 'secondary'} className="flex items-center gap-1 shrink-0">
                {config?.hasAnthropic ? <><CheckCircle className="h-3 w-3" /> 已配置</> : <><XCircle className="h-3 w-3" /> 未配置</>}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>默认写作参数</CardTitle>
          <CardDescription>
            全局默认值，每部小说可在各自设置中覆盖
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>默认模型</Label>
              <Input value={config?.defaultModel ?? '加载中...'} disabled className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>最大 Token</Label>
              <Input value={config?.maxTokens ?? '加载中...'} disabled />
            </div>
            <div className="space-y-2">
              <Label>章节最小字数</Label>
              <Input value="3000" disabled />
            </div>
            <div className="space-y-2">
              <Label>章节最大字数</Label>
              <Input value="5000" disabled />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
