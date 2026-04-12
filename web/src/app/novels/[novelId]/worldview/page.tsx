'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/lib/trpc'

const categories = ['地理', '势力', '功法', '种族', '历史', '物品', '其他']

export default function WorldviewPage() {
  const { novelId } = useParams() as { novelId: string }
  const { data: entries } = trpc.worldview.list.useQuery({ novelId })
  const utils = trpc.useUtils()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: '地理', title: '', content: '' })

  const createMutation = trpc.worldview.create.useMutation({
    onSuccess: () => { utils.worldview.list.invalidate({ novelId }); closeDialog() },
  })
  const updateMutation = trpc.worldview.update.useMutation({
    onSuccess: () => { utils.worldview.list.invalidate({ novelId }); closeDialog() },
  })
  const deleteMutation = trpc.worldview.delete.useMutation({
    onSuccess: () => utils.worldview.list.invalidate({ novelId }),
  })

  function closeDialog() {
    setDialogOpen(false)
    setEditId(null)
    setForm({ category: '地理', title: '', content: '' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (editId) {
      updateMutation.mutate({ id: editId, ...form })
    } else {
      createMutation.mutate({ novelId, ...form })
    }
  }

  // Group by category
  const grouped = (entries ?? []).reduce<Record<string, typeof entries>>((acc, entry) => {
    const cat = entry.category
    if (!acc[cat]) acc[cat] = []
    acc[cat]!.push(entry)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">世界观设定</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          添加条目
        </Button>
      </div>

      {!entries?.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          还没有创建任何世界观条目
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                {category}
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {items!.map((entry) => (
                  <Card
                    key={entry.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setEditId(entry.id)
                      setForm({ category: entry.category, title: entry.title, content: entry.content })
                      setDialogOpen(true)
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between py-2">
                      <CardTitle className="text-sm">{entry.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteMutation.mutate({ id: entry.id })
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </CardHeader>
                    {entry.content && (
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground line-clamp-2">{entry.content}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editId ? '编辑条目' : '添加条目'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
                </div>
              </div>
              <div className="space-y-2">
                <Label>详细描述</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>取消</Button>
              <Button type="submit" disabled={!form.title.trim()}>
                {editId ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
