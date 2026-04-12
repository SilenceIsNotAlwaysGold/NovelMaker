import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const worldviewRouter = router({
  list: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.worldviewEntry.findMany({
        where: { novelId: input.novelId },
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        novelId: z.string(),
        category: z.string().min(1),
        title: z.string().min(1),
        content: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.worldviewEntry.create({ data: input })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        category: z.string().optional(),
        title: z.string().optional(),
        content: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.db.worldviewEntry.update({ where: { id }, data })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.worldviewEntry.delete({ where: { id: input.id } })
    }),
})
