import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { db } from './db'
import { getUserFromRequest } from './auth'

export const createTRPCContext = async (opts?: { req?: Request }) => {
  const user = opts?.req ? await getUserFromRequest(opts.req) : null
  return { db, user }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '请先登录' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})
