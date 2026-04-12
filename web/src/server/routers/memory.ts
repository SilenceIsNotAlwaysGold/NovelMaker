import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { assembleMemoryContext, getMemoryPreview } from '../services/memory.service'

export const memoryRouter = router({
  assemble: publicProcedure
    .input(z.object({ novelId: z.string(), chapterId: z.string(), tokenBudget: z.number().optional() }))
    .query(async ({ input }) => {
      return assembleMemoryContext(input.novelId, input.chapterId, input.tokenBudget)
    }),

  preview: publicProcedure
    .input(z.object({ novelId: z.string(), chapterId: z.string() }))
    .query(async ({ input }) => {
      return getMemoryPreview(input.novelId, input.chapterId)
    }),

  // Update gene content
  updateGene: publicProcedure
    .input(z.object({ novelId: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gene.upsert({
        where: { novelId: input.novelId },
        update: { content: input.content },
        create: { novelId: input.novelId, content: input.content },
      })
    }),

  // Get gene content
  getGene: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.gene.findUnique({ where: { novelId: input.novelId } })
    }),
})
