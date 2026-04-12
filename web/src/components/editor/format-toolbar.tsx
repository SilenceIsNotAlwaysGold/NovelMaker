'use client'

import type { Editor } from '@tiptap/react'
import { Bold, Italic, Heading1, Heading2, Heading3, List, Quote, Minus, Undo, Redo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface FormatToolbarProps {
  editor: Editor | null
}

export function FormatToolbar({ editor }: FormatToolbarProps) {
  if (!editor) return null

  const items = [
    {
      icon: Bold,
      title: '加粗',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      title: '斜体',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    { type: 'separator' as const },
    {
      icon: Heading1,
      title: '标题 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: Heading2,
      title: '标题 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      title: '标题 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    { type: 'separator' as const },
    {
      icon: List,
      title: '列表',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: Quote,
      title: '引用',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: Minus,
      title: '分割线',
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
    },
    { type: 'separator' as const },
    {
      icon: Undo,
      title: '撤销',
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
      disabled: !editor.can().undo(),
    },
    {
      icon: Redo,
      title: '重做',
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
      disabled: !editor.can().redo(),
    },
  ]

  return (
    <div className="flex items-center gap-0.5">
      {items.map((item, i) => {
        if ('type' in item && item.type === 'separator') {
          return <Separator key={i} orientation="vertical" className="mx-1 h-6" />
        }
        const btn = item as Exclude<typeof item, { type: 'separator' }>
        const Icon = btn.icon
        return (
          <Button
            key={i}
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              btn.isActive && 'bg-muted text-foreground',
            )}
            onClick={btn.action}
            disabled={'disabled' in btn ? btn.disabled : false}
            title={btn.title}
          >
            <Icon className="h-4 w-4" />
          </Button>
        )
      })}
    </div>
  )
}
