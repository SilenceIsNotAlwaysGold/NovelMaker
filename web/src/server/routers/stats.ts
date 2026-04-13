import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { checkSceneStructure } from '../services/quality.service'

export const statsRouter = router({
  getTensionCurve: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const volumes = await ctx.db.volume.findMany({
        where: { novelId: input.novelId },
        orderBy: { sortOrder: 'asc' },
        include: {
          chapters: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, content: true, endingMood: true, wordCount: true },
          },
        },
      })

      const points: { chapterTitle: string; volumeTitle: string; tension: number; mood: string; wordCount: number }[] = []
      for (const vol of volumes) {
        for (const ch of vol.chapters) {
          if (!ch.content || ch.wordCount < 100) {
            points.push({ chapterTitle: ch.title, volumeTitle: vol.title, tension: 0, mood: ch.endingMood || '', wordCount: ch.wordCount })
            continue
          }
          const scene = checkSceneStructure(ch.content)
          points.push({
            chapterTitle: ch.title,
            volumeTitle: vol.title,
            tension: scene.beatScore,
            mood: ch.endingMood || '',
            wordCount: ch.wordCount,
          })
        }
      }
      return points
    }),

  getNovelStats: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const novel = await ctx.db.novel.findUniqueOrThrow({
        where: { id: input.novelId },
        include: {
          volumes: {
            include: {
              chapters: {
                select: { id: true, wordCount: true, status: true, title: true },
              },
            },
          },
        },
      })

      // Total word count
      const totalWords = novel.volumes.reduce(
        (sum, vol) => sum + vol.chapters.reduce((s, ch) => s + ch.wordCount, 0),
        0,
      )

      // Chapter stats
      const totalChapters = novel.volumes.reduce((sum, vol) => sum + vol.chapters.length, 0)
      const completedChapters = novel.volumes.reduce(
        (sum, vol) => sum + vol.chapters.filter((ch) => ch.status === 'final' || ch.status === 'revised').length,
        0,
      )
      const draftChapters = novel.volumes.reduce(
        (sum, vol) => sum + vol.chapters.filter((ch) => ch.status === 'draft').length,
        0,
      )

      // Volume breakdown
      const volumeStats = novel.volumes.map((vol) => ({
        id: vol.id,
        title: vol.title,
        status: vol.status,
        chapterCount: vol.chapters.length,
        wordCount: vol.chapters.reduce((s, ch) => s + ch.wordCount, 0),
        avgChapterWords: vol.chapters.length > 0
          ? Math.round(vol.chapters.reduce((s, ch) => s + ch.wordCount, 0) / vol.chapters.length)
          : 0,
      }))

      // Foreshadow stats
      const foreshadows = await ctx.db.foreshadow.groupBy({
        by: ['status'],
        where: { novelId: input.novelId },
        _count: true,
      })

      const foreshadowStats = {
        planted: 0,
        partial: 0,
        resolved: 0,
        abandoned: 0,
      }
      for (const f of foreshadows) {
        if (f.status in foreshadowStats) {
          foreshadowStats[f.status as keyof typeof foreshadowStats] = f._count
        }
      }
      const totalForeshadows = Object.values(foreshadowStats).reduce((a, b) => a + b, 0)
      const foreshadowCompletionRate = totalForeshadows > 0
        ? Math.round(((foreshadowStats.resolved + foreshadowStats.abandoned) / totalForeshadows) * 100)
        : 100

      return {
        totalWords,
        totalChapters,
        completedChapters,
        draftChapters,
        volumeStats,
        foreshadowStats,
        foreshadowCompletionRate,
        estimatedPages: Math.round(totalWords / 300), // ~300 chars per page
      }
    }),
})
