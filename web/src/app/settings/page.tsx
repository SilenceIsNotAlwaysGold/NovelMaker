'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
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
            配置 AI 模型的 API 密钥。密钥存储在服务端 .env 文件中。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Anthropic API Key</Label>
            <div className="flex items-center gap-2">
              <Input type="password" value="••••••••" disabled className="font-mono" />
              <Badge variant={process.env.NEXT_PUBLIC_HAS_ANTHROPIC ? 'default' : 'secondary'}>
                {process.env.NEXT_PUBLIC_HAS_ANTHROPIC ? '已配置' : '未配置'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              在 .env 文件中设置 ANTHROPIC_API_KEY
            </p>
          </div>

          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            <div className="flex items-center gap-2">
              <Input type="password" value="••••••••" disabled className="font-mono" />
              <Badge variant={process.env.NEXT_PUBLIC_HAS_OPENAI ? 'default' : 'secondary'}>
                {process.env.NEXT_PUBLIC_HAS_OPENAI ? '已配置' : '未配置'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              在 .env 文件中设置 OPENAI_API_KEY
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>默认写作参数</CardTitle>
          <CardDescription>
            每部小说可在各自设置中覆盖这些默认值
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>默认模型</Label>
              <Input value="claude-sonnet-4-20250514" disabled className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>最大 Token</Label>
              <Input value="4096" disabled />
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
          <p className="text-xs text-muted-foreground">
            通过 .env 文件配置默认值，每部小说可在创建后单独调整
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
