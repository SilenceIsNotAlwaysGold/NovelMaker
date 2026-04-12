'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, PanelRightOpen, PanelRightClose, FileText, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NovelEditor } from '@/components/editor/novel-editor'
import { AIToolbar } from '@/components/editor/ai-toolbar'
import { MemoryPanel } from '@/components/editor/memory-panel'
import { QualityPanel } from '@/components/editor/quality-panel'
import { FormatToolbar } from '@/components/editor/format-toolbar'
import type { Editor } from '@tiptap/react'
import { trpc } from '@/lib/trpc'

export default function ChapterEditorPage() {
  const params = useParams()
  const router = useRouter()
  const chapterId = params.chapterId as string
  const novelId = params.novelId as string

  const { data: chapter } = trpc.chapter.getById.useQuery({ id: chapterId })
  const updateMutation = trpc.chapter.update.useMutation()

  const [content, setContent] = useState('') // HTML for storage
  const [plainText, setPlainText] = useState('') // plain text for word count / AI
  const [dirty, setDirty] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [showQuality, setShowQuality] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)

  useEffect(() => {
    if (chapter) {
      setContent(chapter.content)
      setDirty(false)
    }
  }, [chapter])

  const save = useCallback(() => {
    updateMutation.mutate(
      { id: chapterId, content },
      {
        onSuccess: () => {
          setDirty(false)
          // Auto-analyze chapter for continuity signals (background, don't block)
          if (content.replace(/\s/g, '').length >= 500) {
            fetch('/api/ai/analyze-chapter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chapterId }),
            }).catch(() => {}) // Silent fail
          }
        },
      },
    )
  }, [chapterId, content, updateMutation])

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  // Auto-save every 30s
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => save(), 30000)
    return () => clearTimeout(timer)
  }, [dirty, content, save])

  // Track text selection
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()
      setSelectedText(sel?.toString() ?? '')
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [])

  const wordCount = plainText.replace(/\s/g, '').length

  if (!chapter) {
    return <div className="py-8 text-center text-muted-foreground">加载中...</div>
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/novels/${novelId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold">{chapter.title}</h2>
            <p className="text-xs text-muted-foreground">{chapter.volume.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={wordCount >= 3000 && wordCount <= 5000 ? 'default' : 'destructive'}>
            {wordCount} 字
          </Badge>
          <Button size="sm" onClick={save} disabled={!dirty || updateMutation.isPending}>
            <Save className="mr-1 h-4 w-4" />
            {updateMutation.isPending ? '保存中...' : dirty ? '保存' : '已保存'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={summarizing || !content || dirty}
            title="AI 自动生成章节摘要"
            onClick={async () => {
              setSummarizing(true)
              try {
                await fetch('/api/ai/summarize', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chapterId }),
                })
              } finally {
                setSummarizing(false)
              }
            }}
          >
            <FileText className="mr-1 h-4 w-4" />
            {summarizing ? '生成摘要...' : '生成摘要'}
          </Button>
          <Button
            variant={showQuality ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowQuality(!showQuality)}
            title="质量检查"
          >
            <BarChart3 className="mr-1 h-4 w-4" />
            质检
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMemory(!showMemory)}
            title="记忆上下文"
          >
            {showMemory ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Format + AI Toolbar */}
      <div className="flex items-center gap-3 border-b py-2">
        <FormatToolbar editor={editor} />
        <div className="h-6 w-px bg-border" />
        <AIToolbar
          novelId={novelId}
          chapterId={chapterId}
          content={plainText}
          selectedText={selectedText}
          onInsert={(text) => {
            // Insert AI text at end via editor
            if (editor) {
              editor.chain().focus('end').insertContent(text).run()
              setContent(editor.getHTML())
              setPlainText(editor.getText())
            }
            setDirty(true)
          }}
          onReplace={(text) => {
            // Replace selected text via editor
            if (editor && selectedText) {
              editor.chain().focus().insertContent(text).run()
              setContent(editor.getHTML())
              setPlainText(editor.getText())
            }
            setDirty(true)
          }}
        />
      </div>

      {/* Editor + Memory Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <NovelEditor
            content={content}
            onChangeHtml={(html) => {
              setContent(html)
              setDirty(true)
            }}
            onChangeText={(text) => {
              setPlainText(text)
            }}
            onEditorReady={setEditor}
          />
        </div>

        {showQuality && (
          <div className="w-72 border-l overflow-hidden">
            <QualityPanel chapterId={chapterId} />
          </div>
        )}

        {showMemory && !showQuality && (
          <div className="w-72 border-l overflow-hidden">
            <MemoryPanel novelId={novelId} chapterId={chapterId} />
          </div>
        )}
      </div>
    </div>
  )
}
