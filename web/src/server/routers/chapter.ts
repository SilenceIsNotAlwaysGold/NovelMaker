import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const chapterRouter = router({
  list: publicProcedure
    .input(z.object({ volumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.chapter.findMany({
        where: { volumeId: input.volumeId },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          wordCount: true,
          status: true,
          updatedAt: true,
        },
      })
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.chapter.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          volume: { select: { id: true, title: true, novelId: true } },
          arc: { select: { id: true, title: true } },
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        volumeId: z.string(),
        title: z.string().min(1),
        arcId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.db.chapter.aggregate({
        where: { volumeId: input.volumeId },
        _max: { sortOrder: true },
      })
      return ctx.db.chapter.create({
        data: {
          volumeId: input.volumeId,
          title: input.title,
          arcId: input.arcId,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        outline: z.string().optional(),
        summary: z.string().optional(),
        status: z.string().optional(),
        arcId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      // Auto-calculate word count when content changes
      const updateData: Record<string, unknown> = { ...data }
      if (data.content !== undefined) {
        // Strip HTML tags for word count
        const plainText = data.content.replace(/<[^>]*>/g, '')
        updateData.wordCount = plainText.replace(/\s/g, '').length
      }
      return ctx.db.chapter.update({ where: { id }, data: updateData })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chapter.delete({ where: { id: input.id } })
    }),
})
