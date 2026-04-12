'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc'

const statusConfig: Record<string, { label: string; color: string }> = {
  planted: { label: '已埋设', color: 'bg-red-500' },
  partial: { label: '部分回收', color: 'bg-yellow-500' },
  resolved: { label: '已回收', color: 'bg-green-500' },
  abandoned: { label: '已废弃', color: 'bg-gray-500' },
}

export default function ForeshadowPage() {
  const { novelId } = useParams() as { novelId: string }
  const { data: foreshadows } = trpc.foreshadow.list.useQuery({ novelId })
  const utils = trpc.useUtils()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'planted',
    plantedAt: '',
    resolvedAt: '',
  })

  const createMutation = trpc.foreshadow.create.useMutation({
    onSuccess: () => { utils.foreshadow.list.invalidate({ novelId }); closeDialog() },
  })
  const updateMutation = trpc.foreshadow.update.useMutation({
    onSuccess: () => { utils.foreshadow.list.invalidate({ novelId }); closeDialog() },
  })
  const deleteMutation = trpc.foreshadow.delete.useMutation({
    onSuccess: () => utils.foreshadow.list.invalidate({ novelId }),
  })

  function closeDialog() {
    setDialogOpen(false)
    setEditId(null)
    setForm({ title: '', description: '', status: 'planted', plantedAt: '', resolvedAt: '' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (editId) {
      updateMutation.mutate({ id: editId, ...form })
    } else {
      createMutation.mutate({ novelId, title: form.title, description: form.description, plantedAt: form.plantedAt })
    }
  }

  const stats = {
    planted: foreshadows?.filter((f) => f.status === 'planted').length ?? 0,
    partial: foreshadows?.filter((f) => f.status === 'partial').length ?? 0,
    resolved: foreshadows?.filter((f) => f.status === 'resolved').length ?? 0,
    abandoned: foreshadows?.filter((f) => f.status === 'abandoned').length ?? 0,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">伏笔追踪</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          添加伏笔
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
            <span className="text-muted-foreground">{cfg.label}</span>
            <span className="font-medium">{stats[key as keyof typeof stats]}</span>
          </div>
        ))}
      </div>

      {!foreshadows?.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          还没有创建任何伏笔
        </div>
      ) : (
        <div className="space-y-2">
          {foreshadows.map((fs) => {
            const cfg = statusConfig[fs.status] ?? statusConfig.planted
            return (
              <Card
                key={fs.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditId(fs.id)
                  setForm({
                    title: fs.title,
                    description: fs.description,
                    status: fs.status,
                    plantedAt: fs.plantedAt,
                    resolvedAt: fs.resolvedAt,
                  })
                  setDialogOpen(true)
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${cfg.color}`} />
                    <CardTitle className="text-sm">{fs.title}</CardTitle>
                    {fs.plantedAt && (
                      <span className="text-xs text-muted-foreground">埋设: {fs.plantedAt}</span>
                    )}
                    {fs.resolvedAt && (
                      <span className="text-xs text-muted-foreground">回收: {fs.resolvedAt}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate({ id: fs.id })
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardHeader>
                {fs.description && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">{fs.description}</p>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editId ? '编辑伏笔' : '添加伏笔'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>伏笔名称</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={form.status} onValueChange={(v) => v && setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>埋设位置</Label>
                  <Input value={form.plantedAt} onChange={(e) => setForm({ ...form, plantedAt: e.target.value })} placeholder="卷一第3章" />
                </div>
                <div className="space-y-2">
                  <Label>回收位置</Label>
                  <Input value={form.resolvedAt} onChange={(e) => setForm({ ...form, resolvedAt: e.target.value })} placeholder="卷二第15章" />
                </div>
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
