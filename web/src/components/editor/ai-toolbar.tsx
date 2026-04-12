'use client'

import { useState, useCallback } from 'react'
import { Wand2, PenLine, Expand, Sparkles, Loader2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type AIOperation = 'continue' | 'rewrite' | 'expand'

interface AIToolbarProps {
  novelId: string
  chapterId: string
  content: string
  onInsert: (text: string) => void
  onReplace: (text: string) => void
  selectedText?: string
}

export function AIToolbar({
  novelId,
  chapterId,
  content,
  onInsert,
  onReplace,
  selectedText,
}: AIToolbarProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [currentOp, setCurrentOp] = useState<AIOperation | null>(null)
  const [completion, setCompletion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleOperation = useCallback(async (operation: AIOperation) => {
    setCurrentOp(operation)
    setShowPreview(false)
    setCompletion('')
    setIsLoading(true)

    const controller = new AbortController()
    setAbortController(controller)

    const text = operation === 'continue'
      ? content.slice(-1500)
      : (selectedText || content.slice(-1500))

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId,
          chapterId,
          operation,
          selectedText: text,
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error('AI request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        result += chunk
        setCompletion(result)
      }

      setShowPreview(true)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('AI generation error:', err)
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }, [novelId, chapterId, content, selectedText])

  const stop = useCallback(() => {
    abortController?.abort()
    setIsLoading(false)
    if (completion) setShowPreview(true)
  }, [abortController, completion])

  const handleAccept = () => {
    if (!completion) return
    if (currentOp === 'continue') {
      onInsert(completion)
    } else {
      onReplace(completion)
    }
    setShowPreview(false)
    setCurrentOp(null)
    setCompletion('')
  }

  const handleReject = () => {
    setShowPreview(false)
    setCurrentOp(null)
    setCompletion('')
    stop()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger disabled={isLoading} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:pointer-events-none disabled:opacity-50">
            <Wand2 className="h-4 w-4" />
            AI 辅助
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleOperation('continue')}>
              <Sparkles className="mr-2 h-4 w-4" />
              续写
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleOperation('rewrite')}
              disabled={!selectedText}
            >
              <PenLine className="mr-2 h-4 w-4" />
              改写{!selectedText && '（请先选中文本）'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleOperation('expand')}
              disabled={!selectedText}
            >
              <Expand className="mr-2 h-4 w-4" />
              扩写{!selectedText && '（请先选中文本）'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI 生成中...
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={stop}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* AI Preview */}
      {(isLoading || showPreview) && completion && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              AI 生成预览
              {currentOp === 'continue' && ' - 续写'}
              {currentOp === 'rewrite' && ' - 改写'}
              {currentOp === 'expand' && ' - 扩写'}
            </span>
            {showPreview && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={handleReject}>
                  <X className="mr-1 h-3 w-3" />
                  丢弃
                </Button>
                <Button size="sm" onClick={handleAccept}>
                  <Check className="mr-1 h-3 w-3" />
                  采纳
                </Button>
              </div>
            )}
          </div>
          <div className="whitespace-pre-wrap font-serif text-sm leading-7">
            {completion}
          </div>
        </div>
      )}
    </div>
  )
}
