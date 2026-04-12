import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { db } from './db'

export const createTRPCContext = async () => {
  return { db }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure
