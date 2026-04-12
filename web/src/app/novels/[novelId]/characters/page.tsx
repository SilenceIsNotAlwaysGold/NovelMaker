'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, User } from 'lucide-react'
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

const roleLabels: Record<string, string> = {
  protagonist: '主角',
  antagonist: '反派',
  supporting: '配角',
  minor: '龙套',
}

export default function CharactersPage() {
  const { novelId } = useParams() as { novelId: string }
  const { data: characters } = trpc.character.list.useQuery({ novelId })
  const utils = trpc.useUtils()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', role: 'supporting', personality: '', background: '', speechPattern: '', verbalHabits: '', voiceSamples: '', behaviorPattern: '' })

  const createMutation = trpc.character.create.useMutation({
    onSuccess: () => {
      utils.character.list.invalidate({ novelId })
      closeDialog()
    },
  })
  const updateMutation = trpc.character.update.useMutation({
    onSuccess: () => {
      utils.character.list.invalidate({ novelId })
      closeDialog()
    },
  })
  const deleteMutation = trpc.character.delete.useMutation({
    onSuccess: () => utils.character.list.invalidate({ novelId }),
  })

  function closeDialog() {
    setDialogOpen(false)
    setEditId(null)
    setForm({ name: '', role: 'supporting', personality: '', background: '', speechPattern: '', verbalHabits: '', voiceSamples: '', behaviorPattern: '' })
  }

  function openEdit(ch: { id: string; name: string; role: string; personality: string; background: string; speechPattern: string; verbalHabits: string; voiceSamples: string; behaviorPattern: string }) {
    setEditId(ch.id)
    setForm({ name: ch.name, role: ch.role, personality: ch.personality, background: ch.background, speechPattern: ch.speechPattern, verbalHabits: ch.verbalHabits, voiceSamples: ch.voiceSamples, behaviorPattern: ch.behaviorPattern })
    setDialogOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      updateMutation.mutate({ id: editId, ...form })
    } else {
      createMutation.mutate({ novelId, ...form })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">人物管理</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          添加人物
        </Button>
      </div>

      {!characters?.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          还没有创建任何人物
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {characters.map((ch) => (
            <Card key={ch.id} className="cursor-pointer" onClick={() => openEdit(ch)}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{ch.name}</CardTitle>
                  <Badge variant="outline">{roleLabels[ch.role] ?? ch.role}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`确定删除人物「${ch.name}」？`)) {
                      deleteMutation.mutate({ id: ch.id })
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              {(ch.personality || ch.background) && (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {ch.personality && <p className="line-clamp-2">{ch.personality}</p>}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editId ? '编辑人物' : '添加人物'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>姓名</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>角色定位</Label>
                  <Select value={form.role} onValueChange={(v) => v && setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>性格特点</Label>
                <Textarea value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>背景故事</Label>
                <Textarea value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} rows={2} />
              </div>

              {/* Voice Print Section */}
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">角色声纹（影响 AI 写对话的质量）</p>
                <div className="space-y-2">
                  <Label>说话方式</Label>
                  <Input value={form.speechPattern} onChange={(e) => setForm({ ...form, speechPattern: e.target.value })} placeholder="例：说话简短有力，常用反问，语气冷淡" />
                </div>
                <div className="space-y-2">
                  <Label>口头禅 / 语言习惯</Label>
                  <Input value={form.verbalHabits} onChange={(e) => setForm({ ...form, verbalHabits: e.target.value })} placeholder={'例：爱说"有意思"，紧张时结巴'} />
                </div>
                <div className="space-y-2">
                  <Label>对话样本（每行一句代表性台词）</Label>
                  <Textarea value={form.voiceSamples} onChange={(e) => setForm({ ...form, voiceSamples: e.target.value })} rows={3} placeholder={"你以为我会怕你？\n哼，不过如此。\n别废话，动手吧。"} />
                </div>
                <div className="space-y-2">
                  <Label>行为模式</Label>
                  <Input value={form.behaviorPattern} onChange={(e) => setForm({ ...form, behaviorPattern: e.target.value })} placeholder="例：紧张时摸刀柄，思考时闭眼，开心时拍人肩膀" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>取消</Button>
              <Button type="submit" disabled={!form.name.trim()}>
                {editId ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
