import { generateNovelText } from '@/server/services/ai.service'

export async function POST(req: Request) {
  const body = await req.json()
  const { novelId, chapterId, operation, selectedText, instruction } = body

  if (!novelId || !operation || selectedText === undefined) {
    return new Response('Missing required fields', { status: 400 })
  }

  const result = await generateNovelText({
    novelId,
    chapterId,
    operation,
    selectedText,
    instruction,
  })

  return result.toTextStreamResponse()
}
