import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const characterRouter = router({
  list: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.character.findMany({
        where: { novelId: input.novelId },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      })
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.character.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          relationsFrom: { include: { to: { select: { id: true, name: true } } } },
          relationsTo: { include: { from: { select: { id: true, name: true } } } },
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        novelId: z.string(),
        name: z.string().min(1),
        role: z.string().optional(),
        profile: z.string().optional(),
        personality: z.string().optional(),
        appearance: z.string().optional(),
        background: z.string().optional(),
        speechPattern: z.string().optional(),
        verbalHabits: z.string().optional(),
        voiceSamples: z.string().optional(),
        behaviorPattern: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.character.create({ data: input })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        role: z.string().optional(),
        profile: z.string().optional(),
        personality: z.string().optional(),
        appearance: z.string().optional(),
        background: z.string().optional(),
        speechPattern: z.string().optional(),
        verbalHabits: z.string().optional(),
        voiceSamples: z.string().optional(),
        behaviorPattern: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.db.character.update({ where: { id }, data })
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.character.delete({ where: { id: input.id } })
    }),
})
