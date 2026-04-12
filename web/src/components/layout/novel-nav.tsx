'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Users, Globe, Eye, Workflow, Dna, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { key: '', label: '概览', icon: BookOpen },
  { key: '/workflow', label: '创作流程', icon: Workflow },
  { key: '/gene', label: '全书基因', icon: Dna },
  { key: '/characters', label: '人物', icon: Users },
  { key: '/worldview', label: '世界观', icon: Globe },
  { key: '/foreshadow', label: '伏笔', icon: Eye },
  { key: '/settings', label: '设置', icon: Settings },
]

export function NovelNav({ novelId }: { novelId: string }) {
  const pathname = usePathname()
  const basePath = `/novels/${novelId}`

  return (
    <nav className="flex gap-1 border-b pb-px">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.key}`
        const isActive =
          tab.key === ''
            ? pathname === basePath
            : pathname.startsWith(href)

        const Icon = tab.icon
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors',
              isActive
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
