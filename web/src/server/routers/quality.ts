import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { runQualityCheck } from '../services/quality.service'

export const qualityRouter = router({
  checkChapter: publicProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      const chapter = await ctx.db.chapter.findUniqueOrThrow({
        where: { id: input.chapterId },
        include: {
          volume: {
            include: {
              novel: { include: { settings: true } },
            },
          },
        },
      })

      const settings = chapter.volume.novel.settings
      return runQualityCheck(chapter.content, {
        min: settings?.chapterMinLen ?? 3000,
        max: settings?.chapterMaxLen ?? 5000,
      })
    }),

  checkText: publicProcedure
    .input(z.object({ text: z.string(), min: z.number().optional(), max: z.number().optional() }))
    .mutation(async ({ input }) => {
      return runQualityCheck(input.text, { min: input.min, max: input.max })
    }),

  // Foreshadow audit
  auditForeshadows: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const foreshadows = await ctx.db.foreshadow.findMany({
        where: { novelId: input.novelId },
        include: { links: true },
      })

      const stats = {
        total: foreshadows.length,
        planted: foreshadows.filter((f) => f.status === 'planted').length,
        partial: foreshadows.filter((f) => f.status === 'partial').length,
        resolved: foreshadows.filter((f) => f.status === 'resolved').length,
        abandoned: foreshadows.filter((f) => f.status === 'abandoned').length,
      }

      const canComplete = stats.planted === 0 && stats.partial === 0

      return {
        stats,
        canComplete,
        foreshadows: foreshadows.map((f) => ({
          id: f.id,
          title: f.title,
          status: f.status,
          plantedAt: f.plantedAt,
          resolvedAt: f.resolvedAt,
          linkCount: f.links.length,
        })),
      }
    }),
})
