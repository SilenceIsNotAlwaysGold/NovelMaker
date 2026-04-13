'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  planted: { label: '已埋设', color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  partial: { label: '部分回收', color: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  resolved: { label: '已回收', color: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
  abandoned: { label: '已废弃', color: 'bg-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/30' },
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

  const stats = useMemo(() => {
    if (!foreshadows?.length) return null
    const planted = foreshadows.filter((f) => f.status === 'planted').length
    const partial = foreshadows.filter((f) => f.status === 'partial').length
    const resolved = foreshadows.filter((f) => f.status === 'resolved').length
    const abandoned = foreshadows.filter((f) => f.status === 'abandoned').length
    const total = foreshadows.length
    const active = planted + partial
    const recoveryRate = total > 0 ? Math.round(((resolved + abandoned) / total) * 100) : 0
    // Health: good if recovery > 60%, warn if 30-60%, bad if < 30%
    let health: 'good' | 'warn' | 'bad' = 'good'
    if (total >= 5 && recoveryRate < 30) health = 'bad'
    else if (total >= 3 && recoveryRate < 60) health = 'warn'
    return { planted, partial, resolved, abandoned, total, active, recoveryRate, health }
  }, [foreshadows])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">伏笔追踪</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          添加伏笔
        </Button>
      </div>

      {/* Health Dashboard */}
      {stats && stats.total > 0 && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                {stats.health === 'good' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {stats.health === 'warn' && <Clock className="h-4 w-4 text-yellow-600" />}
                {stats.health === 'bad' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                伏笔健康度
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold">{stats.recoveryRate}%</span>
                <span className="text-xs text-muted-foreground">回收率</span>
              </div>
              <Progress value={stats.recoveryRate} className="h-2" />
              {/* Stacked bar showing distribution */}
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {stats.resolved > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${(stats.resolved / stats.total) * 100}%` }} />
                )}
                {stats.partial > 0 && (
                  <div className="bg-yellow-500 transition-all" style={{ width: `${(stats.partial / stats.total) * 100}%` }} />
                )}
                {stats.planted > 0 && (
                  <div className="bg-red-500 transition-all" style={{ width: `${(stats.planted / stats.total) * 100}%` }} />
                )}
                {stats.abandoned > 0 && (
                  <div className="bg-gray-400 transition-all" style={{ width: `${(stats.abandoned / stats.total) * 100}%` }} />
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(statusConfig).map(([key, cfg]) => {
                  const count = stats[key as keyof typeof stats] as number
                  if (!count) return null
                  return (
                    <div key={key} className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                      <span className="text-muted-foreground">{cfg.label}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">待回收</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active === 0 ? '所有伏笔已处理' : `${stats.planted} 待回收，${stats.partial} 进行中`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">伏笔密度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold">{stats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 20 ? '伏笔较多，注意回收节奏' : stats.total < 3 ? '伏笔偏少，可适当增加' : '伏笔数量适中'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warnings */}
      {stats && stats.health === 'bad' && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">伏笔堆积警告：</span>有 {stats.active} 条伏笔尚未回收（回收率仅 {stats.recoveryRate}%），
            建议尽快在后续章节中安排回收，避免读者遗忘。
          </div>
        </div>
      )}

      {/* Foreshadow timeline list */}
      {!foreshadows?.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          还没有创建任何伏笔
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border" />
          {foreshadows.map((fs) => {
            const cfg = statusConfig[fs.status] ?? statusConfig.planted
            return (
              <div
                key={fs.id}
                className="relative flex gap-4 py-2 cursor-pointer group"
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
                {/* Timeline dot */}
                <div className={`relative z-10 mt-1.5 h-[14px] w-[14px] shrink-0 rounded-full border-2 border-background ${cfg.color}`} />
                {/* Content */}
                <div className={`flex-1 rounded-lg border p-3 transition-colors group-hover:border-primary/30 ${cfg.bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{fs.title}</span>
                      <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {fs.plantedAt && (
                        <span className="text-[11px] text-muted-foreground">埋: {fs.plantedAt}</span>
                      )}
                      {fs.resolvedAt && (
                        <span className="text-[11px] text-muted-foreground ml-2">收: {fs.resolvedAt}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteMutation.mutate({ id: fs.id })
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {fs.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fs.description}</p>
                  )}
                </div>
              </div>
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
