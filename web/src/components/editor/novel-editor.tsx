'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useRef } from 'react'

interface NovelEditorProps {
  content: string // HTML content from DB
  onChangeHtml: (html: string) => void // For saving to DB
  onChangeText: (text: string) => void // For word count / AI operations
  onEditorReady?: (editor: Editor) => void
  editable?: boolean
}

export function NovelEditor({ content, onChangeHtml, onChangeText, onEditorReady, editable = true }: NovelEditorProps) {
  const isExternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      CharacterCount,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[calc(100vh-16rem)] text-base',
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return
      onChangeHtml(editor.getHTML())
      onChangeText(editor.getText())
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor)
    },
  })

  // Sync external content changes (e.g. AI insert)
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentHtml = editor.getHTML()
      if (content !== currentHtml) {
        isExternalUpdate.current = true
        editor.commands.setContent(content || '')
        isExternalUpdate.current = false
      }
    }
  }, [content, editor])

  return <EditorContent editor={editor} />
}
