import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const settingsRouter = router({
  get: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.novelSettings.findUnique({ where: { novelId: input.novelId } })
    }),

  update: publicProcedure
    .input(
      z.object({
        novelId: z.string(),
        llmModel: z.string().optional(),
        maxTokens: z.number().optional(),
        temperature: z.number().optional(),
        chapterMinLen: z.number().optional(),
        chapterMaxLen: z.number().optional(),
        tokenBudget: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { novelId, ...data } = input
      return ctx.db.novelSettings.upsert({
        where: { novelId },
        update: data,
        create: { novelId, ...data },
      })
    }),
})
