import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const novelRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.novel.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { volumes: true, characters: true } },
        workflow: { select: { currentStage: true } },
      },
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.novel.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        settings: true,
        gene: true,
        workflow: true,
        volumes: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { chapters: true } },
          },
        },
        _count: { select: { characters: true, worldview: true, foreshadow: true } },
      },
    })
  }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        genre: z.string(),
        logline: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.novel.create({
        data: {
          title: input.title,
          genre: input.genre,
          logline: input.logline ?? '',
          settings: { create: {} },
          gene: { create: {} },
          workflow: { create: {} },
        },
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        genre: z.string().optional(),
        logline: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.db.novel.update({ where: { id }, data })
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.novel.delete({ where: { id: input.id } })
  }),
})
