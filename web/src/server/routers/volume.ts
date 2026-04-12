import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const volumeRouter = router({
  list: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.volume.findMany({
        where: { novelId: input.novelId },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { chapters: true, arcs: true } },
        },
      })
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.volume.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          arcs: { orderBy: { sortOrder: 'asc' } },
          chapters: { orderBy: { sortOrder: 'asc' } },
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        novelId: z.string(),
        title: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.db.volume.aggregate({
        where: { novelId: input.novelId },
        _max: { sortOrder: true },
      })
      return ctx.db.volume.create({
        data: {
          novelId: input.novelId,
          title: input.title,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        summary: z.string().optional(),
        memory: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.db.volume.update({ where: { id }, data })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.volume.delete({ where: { id: input.id } })
    }),
})
