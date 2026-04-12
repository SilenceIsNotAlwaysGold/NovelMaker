import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const foreshadowRouter = router({
  list: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.foreshadow.findMany({
        where: { novelId: input.novelId },
        orderBy: { createdAt: 'asc' },
        include: { links: true },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        novelId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        plantedAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.foreshadow.create({ data: input })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        resolvedAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.db.foreshadow.update({ where: { id }, data })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.foreshadow.delete({ where: { id: input.id } })
    }),
})
