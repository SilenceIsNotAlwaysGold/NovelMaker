import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

const stages = [
  'brainstorm',
  'skeleton',
  'volume_planning',
  'chapter_writing',
  'volume_closing',
  'book_closing',
] as const

const stageInfo: Record<string, { label: string; description: string; requirements: string[] }> = {
  brainstorm: {
    label: '创意风暴',
    description: '确定题材、主角、核心冲突、风格基调',
    requirements: ['完成全书基因文档'],
  },
  skeleton: {
    label: '骨架搭建',
    description: '制定全书大纲、人物档案、世界观设定',
    requirements: ['至少创建1个人物', '至少创建1个世界观条目'],
  },
  volume_planning: {
    label: '卷级规划',
    description: '划分卷结构、设置弧线、布局伏笔',
    requirements: ['至少创建1个卷', '至少创建1个伏笔'],
  },
  chapter_writing: {
    label: '逐章创作',
    description: '按卷逐章写作，AI辅助生成，三重质检',
    requirements: ['至少完成1个章节'],
  },
  volume_closing: {
    label: '卷末收尾',
    description: '人物快照、伏笔审计、压缩归档',
    requirements: ['当前卷所有章节已完成'],
  },
  book_closing: {
    label: '全书收尾',
    description: '伏笔清零、全书审计、导出终稿',
    requirements: ['所有伏笔已回收或废弃', '所有卷已完成'],
  },
}

export const workflowRouter = router({
  getStatus: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflowState.findUnique({
        where: { novelId: input.novelId },
      })

      const currentStage = workflow?.currentStage ?? 'brainstorm'
      const currentIndex = stages.indexOf(currentStage as typeof stages[number])

      // Check requirements for current stage
      const novel = await ctx.db.novel.findUniqueOrThrow({
        where: { id: input.novelId },
        include: {
          gene: true,
          _count: {
            select: { characters: true, worldview: true, volumes: true, foreshadow: true },
          },
        },
      })

      const chapterCount = await ctx.db.chapter.count({
        where: { volume: { novelId: input.novelId } },
      })

      const unresolvedForeshadows = await ctx.db.foreshadow.count({
        where: { novelId: input.novelId, status: { in: ['planted', 'partial'] } },
      })

      // Build stage list with completion status
      const stageList = stages.map((stage, index) => {
        let canAdvance = false
        if (stage === 'brainstorm') canAdvance = !!novel.gene?.content
        else if (stage === 'skeleton') canAdvance = novel._count.characters > 0 && novel._count.worldview > 0
        else if (stage === 'volume_planning') canAdvance = novel._count.volumes > 0 && novel._count.foreshadow > 0
        else if (stage === 'chapter_writing') canAdvance = chapterCount > 0
        else if (stage === 'volume_closing') canAdvance = chapterCount > 0
        else if (stage === 'book_closing') canAdvance = unresolvedForeshadows === 0

        return {
          key: stage,
          ...stageInfo[stage],
          status: index < currentIndex
            ? 'completed' as const
            : index === currentIndex
              ? 'current' as const
              : 'locked' as const,
          canAdvance,
        }
      })

      return {
        currentStage,
        stages: stageList,
        stageData: workflow?.stageData ? JSON.parse(workflow.stageData) : {},
      }
    }),

  advanceStage: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflowState.findUniqueOrThrow({
        where: { novelId: input.novelId },
      })

      const currentIndex = stages.indexOf(workflow.currentStage as typeof stages[number])
      if (currentIndex >= stages.length - 1) {
        throw new Error('Already at final stage')
      }

      const nextStage = stages[currentIndex + 1]
      return ctx.db.workflowState.update({
        where: { novelId: input.novelId },
        data: { currentStage: nextStage },
      })
    }),

  saveStageData: publicProcedure
    .input(z.object({ novelId: z.string(), data: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workflowState.update({
        where: { novelId: input.novelId },
        data: { stageData: input.data },
      })
    }),
})
